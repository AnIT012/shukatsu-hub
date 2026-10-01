// ESや選考の中身を、端末の中で暗号化してからクラウドへ送るための道具(エンドツーエンド暗号化)。
//
// 鍵の形:
//   データ鍵(DEK) … 端末で作る乱数の AES-GCM 256bit 鍵。中身(applications/events)はこれで暗号化する。
//   包む鍵(KEK)  … ログインパスワードから PBKDF2-SHA256 で作る鍵。DEK を包んで(暗号化して)クラウドに置く。
// クラウドには「包んだDEK」と「暗号文」しか置かない。パスワードもDEKも送らない。
// → 開発者がデータベースを開いても、中身は読めない。パスワードを失えば、誰にも戻せない。
//
// 通知のために、通知をオンにしている人だけ「企業名・イベント名・種類・日時・決着」だけを
// 平文で別に置く(notifyFeed)。ES・メモ・ID・リンク・職種・優先度は入れない。
//
// このファイルは React にも app の型にも依存しない(node の検査からそのまま読むため)。

export const VAULT_VERSION = 1;
const PBKDF2_ITER = 600_000;

export interface VaultKeys {
  v: number;
  kdf: "PBKDF2-SHA256";
  iter: number;
  /** base64 */
  salt: string;
  /** base64(AES-GCM の iv) */
  iv: string;
  /** base64(包んだDEK) */
  wrapped: string;
}

export interface Sealed {
  v: number;
  iv: string;
  ct: string;
}

export interface VaultColumn {
  keys: VaultKeys;
  sealed: Sealed;
}

// ---- base64 ----
export function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
export function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const enc = new TextEncoder();
const dec = new TextDecoder();
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function aesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function kekFrom(password: string, salt: Uint8Array, iter: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(password) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iter },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** 新しいデータ鍵(32バイトの乱数) */
export function generateDek(): Uint8Array {
  return rand(32);
}

/** データ鍵をパスワードで包む(クラウドに置く形) */
export async function wrapDek(
  dek: Uint8Array,
  password: string,
  iter: number = PBKDF2_ITER,
): Promise<VaultKeys> {
  const salt = rand(16);
  const iv = rand(12);
  const kek = await kekFrom(password, salt, iter);
  const wrapped = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, kek, dek as BufferSource),
  );
  return {
    v: VAULT_VERSION,
    kdf: "PBKDF2-SHA256",
    iter,
    salt: toB64(salt),
    iv: toB64(iv),
    wrapped: toB64(wrapped),
  };
}

/** 包んだデータ鍵をパスワードで開く。パスワードが違えば null(GCMの検証で落ちる) */
export async function unwrapDek(keys: VaultKeys, password: string): Promise<Uint8Array | null> {
  try {
    const kek = await kekFrom(password, fromB64(keys.salt), keys.iter);
    const raw = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(keys.iv) as BufferSource },
      kek,
      fromB64(keys.wrapped) as BufferSource,
    );
    return new Uint8Array(raw);
  } catch {
    return null;
  }
}

/** 中身を暗号化する */
export async function seal(dek: Uint8Array, value: unknown): Promise<Sealed> {
  const iv = rand(12);
  const key = await aesKey(dek);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      enc.encode(JSON.stringify(value)) as BufferSource,
    ),
  );
  return { v: VAULT_VERSION, iv: toB64(iv), ct: toB64(ct) };
}

/** 暗号文を開く。鍵が違う/壊れていれば null */
export async function unseal<T = unknown>(dek: Uint8Array, sealed: Sealed): Promise<T | null> {
  try {
    const key = await aesKey(dek);
    const raw = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(sealed.iv) as BufferSource },
      key,
      fromB64(sealed.ct) as BufferSource,
    );
    return JSON.parse(dec.decode(raw)) as T;
  } catch {
    return null;
  }
}

/** vault 列の中身として形が正しいか */
export function isVaultColumn(v: unknown): v is VaultColumn {
  const x = v as VaultColumn | null;
  return (
    !!x &&
    typeof x === "object" &&
    !!x.keys &&
    typeof x.keys.salt === "string" &&
    typeof x.keys.wrapped === "string" &&
    !!x.sealed &&
    typeof x.sealed.ct === "string"
  );
}

// ---- 通知用の最小限(平文) ----
// notify 関数(supabase/functions/notify)が読む項目だけを抜く。ここに足す時は、
// プライバシーの説明(legal-content / ご利用の前に)も一緒に直すこと。
export function buildNotifyFeed(applications: any[], events: any[]) {
  return {
    applications: (applications ?? []).map((a) => ({
      company: a?.company ?? "",
      stages: (a?.stages ?? []).map((s: any) => ({
        result: s?.result ?? "pending",
        tasks: (s?.tasks ?? []).map((t: any) => ({
          kind: t?.kind ?? "other",
          dueAt: t?.dueAt ?? null,
          heldAt: t?.heldAt ?? null,
          done: !!t?.done,
        })),
      })),
    })),
    events: (events ?? []).map((e) => ({
      company: e?.company ?? "",
      title: e?.title ?? "",
      status: e?.status ?? "todo",
      applyBy: e?.applyBy ?? null,
      heldAt: e?.heldAt ?? null,
      applyDone: !!e?.applyDone,
    })),
  };
}

// ---- 古い版のアプリ向けの「置き札」 ----
// 暗号化後の data 列には、中身の代わりにこの1件だけを置く。
// 古い版(キャッシュされたPWA等)が開いても空一覧にならず、更新を促す1行が出る。
// 古い版が書き込んでも data 列が変わるだけで、暗号文(vault 列)には触れない。
export const STUB_APP_ID = "vault-stub";
export function stubApplications(now: string) {
  return [
    {
      id: STUB_APP_ID,
      company: "アプリを最新版に更新してください（データは無事です）",
      role: "",
      priority: "medium",
      result: "in_progress",
      selectionType: "main",
      venueMode: "",
      venuePlace: "",
      links: [],
      esEntries: [],
      memo: "",
      steps: [],
      stages: [],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// ---- 端末に置くデータ鍵 ----
// 端末には平文のキャッシュが既にあるので、同じ端末に鍵を置いても守りは下がらない。
// クラウドには絶対に送らない。
const dekKey = (userId: string) => `shukatsu-dashboard:vault-dek:${userId}`;

export function loadLocalDek(userId: string): Uint8Array | null {
  try {
    const v = localStorage.getItem(dekKey(userId));
    return v ? fromB64(v) : null;
  } catch {
    return null;
  }
}
export function saveLocalDek(userId: string, dek: Uint8Array) {
  try {
    localStorage.setItem(dekKey(userId), toB64(dek));
  } catch {
    // ignore
  }
}

// ---- ログイン直後のパスワード受け渡し(メモリだけ・保存しない) ----
let pending: { password: string; at: number } | null = null;
/** ログイン/登録に成功した直後に呼ぶ。鍵を作る/開くのに一度だけ使う */
export function setPendingPassword(password: string) {
  pending = { password, at: Date.now() };
}
/**
 * 読むだけ(消さない)。5分より古いものは捨てる。
 * 読み込みが途中で取り消されて2回走ることがある(開発時の StrictMode・ログイン直後の再描画)ので、
 * 読んだ時点では消さず、鍵を開けた/作った後に clearPendingPassword で消す。
 */
export function peekPendingPassword(): string | null {
  if (pending && Date.now() - pending.at > 5 * 60 * 1000) pending = null;
  return pending?.password ?? null;
}
/** 鍵を開けた/作った後、ログインに失敗した時に消す */
export function clearPendingPassword() {
  pending = null;
}
