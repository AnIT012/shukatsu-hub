"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type {
  Application,
  ESEntry,
  EventItem,
  Priority,
  RelatedLink,
  ResultStatus,
  SelectionStage,
  SelectionStep,
  SelectionTask,
  SelectionType,
  StageResult,
  StepKind,
  Theme,
  FontChoice,
  NotifySettings,
  QuickLink,
} from "./types";
import {
  DEFAULT_NOTIFY,
  FONT_OPTIONS,
  FONT_DEFAULT,
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  LS_FONT_KEY,
  LS_FONTSCALE_KEY,
  LS_KEY,
  LS_QUICKLINKS_KEY,
  LS_SEEDED_KEY,
  LS_THEME_KEY,
} from "./constants";
import { newId } from "./utils";
import { DATA_TABLE, supabase } from "./supabase";
import { normalizeApps, normalizeEvents } from "./io";
import { pushSnapshot, listSnapshots, type Snapshot } from "./snapshots";
import {
  listDailyBackups as listDailyBackupsIdb,
  saveDailyBackup,
  type DailyBackup,
} from "./daily-backup";
import {
  buildNotifyFeed,
  generateDek,
  isVaultColumn,
  loadLocalDek,
  saveLocalDek,
  seal,
  stubApplications,
  clearPendingPassword,
  peekPendingPassword,
  unseal,
  unwrapDek,
  wrapDek,
  type VaultColumn,
  type VaultKeys,
} from "./vault";
import { badgeCount, deriveResult } from "./next-action";
import { buildSampleApplications } from "./sample";
import { useAuth } from "./auth";

export type SaveState = "idle" | "saving" | "saved" | "offline";

/**
 * クラウドの中身の暗号化の状態。
 *  off     … 端末だけで使っている / サーバーが暗号化の列にまだ対応していない(従来どおり)
 *  setup   … クラウドに平文のまま。パスワードを一度入れれば暗号化に切り替わる(使うのは止めない)
 *  locked  … クラウドは暗号化済みだが、この端末に鍵が無い。パスワードを入れるまで中身を出さない・書かない
 *  ready   … 暗号化して送っている
 */
export type VaultState = "off" | "setup" | "locked" | "ready";

interface NewApplicationInput {
  company: string;
  role: string;
  priority: Priority;
  selectionType: SelectionType;
  result?: ResultStatus;
}

type AppPatch = Partial<
  Pick<
    Application,
    | "company"
    | "role"
    | "priority"
    | "result"
    | "selectionType"
    | "venueMode"
    | "venuePlace"
    | "memo"
    | "loginId"
    | "loginIdMasked"
    | "loginIdPinned"
  >
>;

type EventPatch = Partial<Omit<EventItem, "id" | "createdAt" | "updatedAt">>;

interface StoreValue {
  loaded: boolean;
  applications: Application[];
  saveState: SaveState;
  lastSavedAt: number | null;
  /** 手動同期(更新ボタン)。未送信があれば送信、無ければ最新を取得。 */
  syncNow: () => Promise<void>;
  theme: Theme;
  setTheme: (t: Theme) => void;
  font: FontChoice;
  setFont: (f: FontChoice) => void;
  notify: NotifySettings;
  setNotify: (patch: Partial<NotifySettings>) => void;
  /** よく使うサイト(端末ローカル)。 */
  quickLinks: QuickLink[];
  setQuickLinks: (next: QuickLink[]) => void;
  /** 文字サイズ倍率(端末ローカル・既定は FONT_SCALE_DEFAULT)。 */
  fontScale: number;
  setFontScale: (scale: number) => void;
  pushSubscriptions: PushSubscriptionJSON[];
  addPushSubscription: (sub: PushSubscriptionJSON) => void;
  addApplication: (input: NewApplicationInput) => string;
  updateApplication: (id: string, patch: AppPatch) => void;
  deleteApplication: (id: string) => void;
  addStep: (appId: string, kind?: SelectionStep["kind"]) => string | undefined;
  addStepsBulk: (appId: string, kinds: SelectionStep["kind"][]) => void;
  /** 全ステップを kinds で作り直す(手付かず時のテンプレ上書き用) */
  replaceSteps: (appId: string, kinds: SelectionStep["kind"][]) => void;
  updateStep: (
    appId: string,
    stepId: string,
    patch: Partial<Omit<SelectionStep, "id">>,
  ) => void;
  deleteStep: (appId: string, stepId: string) => void;
  moveStep: (appId: string, stepId: string, dir: -1 | 1) => void;
  setStepOrder: (appId: string, orderedIds: string[]) => void;
  // ---- 選考段階(段階＞タスク・新モデル) ----
  /** 段階を追加(1段階1タスク=直列)。返り値は新タスクのid(編集を開く用) */
  addStage: (appId: string, kind?: StepKind) => string | undefined;
  deleteStage: (appId: string, stageId: string) => void;
  moveStage: (appId: string, stageId: string, dir: -1 | 1) => void;
  setStageResult: (
    appId: string,
    stageId: string,
    result: StageResult,
  ) => void;
  /** 既存段階に並行タスクを追加。返り値は新タスクのid */
  addTask: (
    appId: string,
    stageId: string,
    kind?: StepKind,
  ) => string | undefined;
  updateTask: (
    appId: string,
    stageId: string,
    taskId: string,
    patch: Partial<Omit<SelectionTask, "id">>,
  ) => void;
  /** タスク削除。段階の最後の1つを消すと段階ごと削除する */
  deleteTask: (appId: string, stageId: string, taskId: string) => void;
  /** 〇トグル: 未 ⇄ やった */
  toggleTaskDone: (appId: string, stageId: string, taskId: string) => void;
  /** kinds から段階をまとめて追加(各kind=1段階1タスク・直列) */
  addStagesBulk: (appId: string, kinds: StepKind[]) => void;
  /** 全段階を kinds で作り直す(手付かず時のテンプレ上書き用) */
  replaceStages: (appId: string, kinds: StepKind[]) => void;
  addLink: (appId: string) => string | undefined;
  updateLink: (
    appId: string,
    linkId: string,
    patch: Partial<Omit<RelatedLink, "id">>,
  ) => void;
  deleteLink: (appId: string, linkId: string) => void;
  addEsEntry: (appId: string) => string | undefined;
  updateEsEntry: (
    appId: string,
    entryId: string,
    patch: Partial<Omit<ESEntry, "id">>,
  ) => void;
  deleteEsEntry: (appId: string, entryId: string) => void;
  replaceAll: (apps: Application[]) => void;
  /** 取り込み: 既存を消さず、選考/イベントを先頭に追加(idは振り直して衝突回避)。 */
  mergeImport: (apps: Application[], events: EventItem[]) => void;
  /** 移行前バックアップ等の生JSON文字列から applications/events を復元。成功で true */
  restoreFromRaw: (raw: string) => boolean;
  /** 自動ローカルバックアップ(復元ポイント)の一覧を取得(新しい順) */
  listLocalSnapshots: () => Snapshot[];
  /** 毎日の自動バックアップ(端末・30日分)の一覧(新しい順) */
  listDailyBackups: () => Promise<DailyBackup[]>;
  /** クラウドの暗号化の状態 */
  vaultState: VaultState;
  /** パスワードで暗号化の鍵を開く/作る。違えば false */
  unlockVault: (password: string) => Promise<boolean>;
  /** 全データ(選考+イベント)を空にする。設定の「全データ削除」用。 */
  clearAll: () => void;
  /** 新規(空)ユーザーにだけサンプルを投入。投入したら true。既存データは絶対に壊さない。 */
  seedSampleIfEmpty: () => boolean;
  // ---- 説明会・イベント ----
  events: EventItem[];
  addEvent: (input: { company: string; title: string }) => string;
  updateEvent: (id: string, patch: EventPatch) => void;
  deleteEvent: (id: string) => void;
  addEventLink: (id: string) => string | undefined;
  updateEventLink: (
    id: string,
    linkId: string,
    patch: Partial<Omit<RelatedLink, "id">>,
  ) => void;
  deleteEventLink: (id: string, linkId: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const nowISO = () => new Date().toISOString();

function applyFont(font: FontChoice) {
  if (typeof document === "undefined") return;
  const opt = FONT_OPTIONS.find((o) => o.value === font) ?? FONT_OPTIONS[0];
  // 選んだフォントだけ Google Fonts を動的読み込み(初期表示はシステムフォント)
  if (opt.googleHref) {
    const id = `gf-${opt.value}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = opt.googleHref;
      document.head.appendChild(link);
    }
  }
  document.documentElement.style.setProperty("--app-font", opt.stack);
}

function makeStep(kind: SelectionStep["kind"] = "es"): SelectionStep {
  return {
    id: newId(),
    kind,
    name: "",
    dueAt: null,
    dueDone: false,
    heldAt: null,
    status: "not_started",
    location: "",
    memo: "",
  };
}

function makeTask(kind: StepKind = "es"): SelectionTask {
  return {
    id: newId(),
    kind,
    name: "",
    dueAt: null,
    heldAt: null,
    location: "",
    memo: "",
    submitted: false,
    done: false,
  };
}

// 〇タップで状態を一段進める。
// 締切+実施日が両方ある: 未 → 提出済(締切消化) → 完了 → 未(リセット)
// 片方だけ: 未 ⇄ 完了
function advanceTaskState(t: SelectionTask): SelectionTask {
  const hasBoth = !!t.dueAt && !!t.heldAt;
  if (hasBoth) {
    if (!t.submitted && !t.done) return { ...t, submitted: true };
    if (t.submitted && !t.done) return { ...t, done: true };
    return { ...t, submitted: false, done: false };
  }
  return { ...t, submitted: false, done: !t.done };
}

function makeStage(kind: StepKind = "es"): SelectionStage {
  return { id: newId(), label: "", tasks: [makeTask(kind)], result: "pending" };
}

interface LocalData {
  applications: Application[];
  events: EventItem[];
  notify: NotifySettings;
  pushSubscriptions: PushSubscriptionJSON[];
  /** この端末で最後に保存した時刻(ISO)。クラウドの updated_at と比較して新しい方を採用する */
  savedAt: string;
  /** まだクラウドへ送れていない編集があるか(オフライン編集の取りこぼし防止) */
  dirty: boolean;
  theme: Theme | null;
  font: FontChoice | null;
  /** よく使うサイト(アカウントのデータ。クラウドでは選考と一緒に暗号化して同期する) */
  quickLinks: QuickLink[];
}

function readLocal(key: string): LocalData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 旧形式: 配列 or {applications} / 新形式: {applications, events}
    const apps = Array.isArray(parsed) ? parsed : parsed?.applications;
    if (!Array.isArray(apps)) return null;
    return {
      applications: normalizeApps(apps),
      events: normalizeEvents(parsed?.events), // 旧データは events 無し → []
      notify: { ...DEFAULT_NOTIFY, ...(parsed?.notify ?? {}) },
      pushSubscriptions: Array.isArray(parsed?.pushSubscriptions)
        ? parsed.pushSubscriptions
        : [],
      savedAt: typeof parsed?.savedAt === "string" ? parsed.savedAt : "",
      dirty: parsed?.dirty === true,
      theme: typeof parsed?.theme === "string" ? (parsed.theme as Theme) : null,
      font: typeof parsed?.font === "string" ? (parsed.font as FontChoice) : null,
      quickLinks: Array.isArray(parsed?.quickLinks) ? (parsed.quickLinks as QuickLink[]) : [],
    };
  } catch {
    return null;
  }
}

interface CachePayload {
  applications: Application[];
  events: EventItem[];
  notify: NotifySettings;
  pushSubscriptions: PushSubscriptionJSON[];
  theme: Theme;
  font: FontChoice;
  savedAt: string;
  /** 省いたら、端末キャッシュにある値をそのまま残す */
  quickLinks?: QuickLink[];
}

/** クラウドの1行(data/updated_at/vault)を読んだ結果 */
interface RemoteRow {
  data: unknown;
  updated_at: string;
  vault: unknown;
}

/** クラウドの中身を、画面に出す形にしたもの */
interface Decoded {
  apps: Application[];
  evs: EventItem[];
  ntf: NotifySettings;
  subs: PushSubscriptionJSON[];
  theme: Theme | null;
  font: FontChoice | null;
  /** よく使うサイト。クラウドに無ければ null(=手元の値を変えない) */
  ql: QuickLink[] | null;
}

/** data 列のうち、暗号化しない設定(通知・テーマ等)を読む */
function settingsOf(remote: any): Omit<Decoded, "apps" | "evs" | "ql"> {
  const obj = remote && typeof remote === "object" && !Array.isArray(remote) ? remote : {};
  return {
    ntf: { ...DEFAULT_NOTIFY, ...(obj.notify ?? {}) },
    subs: Array.isArray(obj.pushSubscriptions) ? obj.pushSubscriptions : [],
    theme: typeof obj.theme === "string" ? (obj.theme as Theme) : null,
    font: typeof obj.font === "string" ? (obj.font as FontChoice) : null,
  };
}

/** 平文の data 列を読む(旧形式=配列 にも対応) */
function decodePlain(remote: any): Decoded {
  if (Array.isArray(remote)) {
    return { apps: normalizeApps(remote), evs: [], ql: null, ...settingsOf(null) };
  }
  return {
    apps: normalizeApps(remote?.applications),
    evs: normalizeEvents(remote?.events),
    ql: Array.isArray(remote?.quickLinks) ? (remote.quickLinks as QuickLink[]) : null,
    ...settingsOf(remote),
  };
}

/** ゲスト(端末だけ)のよく使うサイト。ログイン中のアカウントには使わない */
function readGuestQuickLinks(): QuickLink[] {
  try {
    const v = localStorage.getItem(LS_QUICKLINKS_KEY);
    const arr = v ? JSON.parse(v) : [];
    return Array.isArray(arr) ? (arr as QuickLink[]) : [];
  } catch {
    return [];
  }
}

/** 端末キャッシュに保存。オフラインでも必ず成功させ、dirty で未送信を記録する。 */
function writeLocal(key: string, payload: CachePayload, dirty: boolean) {
  try {
    const quickLinks = payload.quickLinks ?? readLocal(key)?.quickLinks ?? [];
    localStorage.setItem(key, JSON.stringify({ version: 1, dirty, ...payload, quickLinks }));
  } catch {
    // 容量超過等は無視(UI 表示には影響させない)
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { mode, user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [theme, setThemeState] = useState<Theme>("indigo");
  const [font, setFontState] = useState<FontChoice>(FONT_DEFAULT);
  const [notify, setNotifyState] = useState<NotifySettings>(DEFAULT_NOTIFY);
  const [quickLinks, setQuickLinksState] = useState<QuickLink[]>([]);
  const [fontScale, setFontScaleState] = useState<number>(FONT_SCALE_DEFAULT);
  const [pushSubscriptions, setPushSubscriptions] = useState<
    PushSubscriptionJSON[]
  >([]);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const seedTriedRef = useRef(false);
  // 楽観ロック用: この端末が最後にクラウドから読んだ updated_at。
  // 書き込み時に「自分の読んだ版のまま」なら上書きOK、変わっていれば別端末が更新したと判断する。
  const baseUpdatedAtRef = useRef<string>("");

  // ---- 暗号化(エンドツーエンド)。仕組みは lib/vault.ts の冒頭 ----
  const [vaultState, setVaultStateRaw] = useState<VaultState>("off");
  const vaultStateRef = useRef<VaultState>("off");
  const setVaultState = (s: VaultState) => {
    vaultStateRef.current = s;
    setVaultStateRaw(s);
    // 鍵が手に入ったら、ログイン時に預かったパスワードはもう要らない(メモリからも消す)
    if (s === "ready") clearPendingPassword();
  };
  /** この端末で開いたデータ鍵(メモリ) */
  const dekRef = useRef<Uint8Array | null>(null);
  /** クラウドに置く「包んだデータ鍵」 */
  const keysRef = useRef<VaultKeys | null>(null);
  /** サーバーの表に vault 列があるか(null=まだ分からない)。無ければ従来どおり平文で動く */
  const vaultColRef = useRef<boolean | null>(null);

  /** 自分の1行を読む。vault 列が無いサーバーでも落ちずに従来の形で読む */
  const fetchRow = async (): Promise<RemoteRow | null> => {
    if (!supabase || !user) return null;
    if (vaultColRef.current !== false) {
      const { data, error } = await supabase
        .from(DATA_TABLE)
        .select("data, updated_at, vault")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error) {
        vaultColRef.current = true;
        if (!data) return null;
        return {
          data: data.data,
          updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
          vault: (data as any).vault ?? null,
        };
      }
      // 列が無い(=SQL未適用)なら平文の従来動作へ。それ以外のエラーは投げる
      if (!/vault/i.test(error.message ?? "")) throw error;
      vaultColRef.current = false;
    }
    const { data, error } = await supabase
      .from(DATA_TABLE)
      .select("data, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      data: data.data,
      updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
      vault: null,
    };
  };

  /**
   * 読んだ1行を画面の形にする。暗号化済みなら開く。
   * 鍵が無ければ null を返し、状態を locked にする(中身は出さない・書かない)。
   * password は、ログイン直後か「パスワードを入れてください」の画面から来た時だけ渡る。
   */
  const decodeRow = async (
    row: RemoteRow,
    password: string | null,
  ): Promise<Decoded | null> => {
    if (!user) return decodePlain(row.data);
    if (isVaultColumn(row.vault)) {
      const vault = row.vault as VaultColumn;
      keysRef.current = vault.keys;
      const tryOpen = async (dek: Uint8Array | null) => {
        if (!dek) return null;
        const body = await unseal<{ applications: unknown; events: unknown }>(dek, vault.sealed);
        return body ? { dek, body } : null;
      };
      let opened =
        (await tryOpen(dekRef.current)) ?? (await tryOpen(loadLocalDek(user.id)));
      if (!opened && password) {
        opened = await tryOpen(await unwrapDek(vault.keys, password));
      }
      if (!opened) {
        dekRef.current = null;
        setVaultState("locked");
        return null;
      }
      dekRef.current = opened.dek;
      saveLocalDek(user.id, opened.dek);
      setVaultState("ready");
      return {
        apps: normalizeApps((opened.body as any).applications),
        evs: normalizeEvents((opened.body as any).events),
        ql: Array.isArray((opened.body as any).quickLinks)
          ? ((opened.body as any).quickLinks as QuickLink[])
          : null,
        ...settingsOf(row.data),
      };
    }
    // まだ平文のクラウド
    if (vaultColRef.current) {
      if (password) {
        // ログイン直後: この場で鍵を作る(送るのは次の保存から)
        const dek = generateDek();
        keysRef.current = await wrapDek(dek, password);
        dekRef.current = dek;
        saveLocalDek(user.id, dek);
        setVaultState("ready");
      } else if (!dekRef.current || !keysRef.current) {
        setVaultState("setup");
      }
    } else {
      setVaultState("off");
    }
    return decodePlain(row.data);
  };

  /** 送る形を作る。鍵があれば中身は暗号文にし、data 列には置き札と通知用の最小限だけを置く */
  const encodeDoc = async (c: {
    applications: Application[];
    events: EventItem[];
    notify: NotifySettings;
    pushSubscriptions: PushSubscriptionJSON[];
    theme: Theme | null;
    font: FontChoice | null;
    quickLinks: QuickLink[];
  }): Promise<{ data: unknown; vault?: VaultColumn }> => {
    const settings = {
      notify: c.notify,
      pushSubscriptions: c.pushSubscriptions,
      ...(c.theme ? { theme: c.theme } : {}),
      ...(c.font ? { font: c.font } : {}),
    };
    if (vaultColRef.current && dekRef.current && keysRef.current) {
      const sealed = await seal(dekRef.current, {
        applications: c.applications,
        events: c.events,
        quickLinks: c.quickLinks,
      });
      return {
        data: {
          applications: stubApplications(nowISO()),
          events: [],
          ...settings,
          vault: 1,
          // 通知をオフにしている人の分は、企業名も含めて何も平文で置かない
          ...(c.notify.enabled
            ? { notifyFeed: buildNotifyFeed(c.applications, c.events) }
            : {}),
        },
        vault: { keys: keysRef.current, sealed },
      };
    }
    return {
      data: {
        applications: c.applications,
        events: c.events,
        quickLinks: c.quickLinks,
        ...settings,
      },
    };
  };

  // saveState の最新値を同期参照(オフライン復帰の検知用・クロージャの陳腐化回避)
  const saveStateRef = useRef<SaveState>("idle");
  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  const cacheKey = mode === "cloud" && user ? `${LS_KEY}:${user.id}` : LS_KEY;

  // ---- テーマ: 読み込み & 適用 & 保存 ----
  useEffect(() => {
    try {
      const t = localStorage.getItem(LS_THEME_KEY) as Theme | null;
      if (t) setThemeState(t);
      const f = localStorage.getItem(LS_FONT_KEY) as FontChoice | null;
      if (f) setFontState(f);
      const fs = Number(localStorage.getItem(LS_FONTSCALE_KEY));
      if (fs >= FONT_SCALE_MIN && fs <= FONT_SCALE_MAX) setFontScaleState(fs);
    } catch {
      // ignore
    }
  }, []);

  // 文字サイズ: html に zoom を当てて全体を拡大/縮小(px指定にも効く)
  useEffect(() => {
    document.documentElement.style.zoom =
      fontScale === 1 ? "" : String(fontScale);
    // 入力欄の16px下限を、縮めた分だけ割り戻すための値(globals.css)
    document.documentElement.style.setProperty("--app-zoom", String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    applyFont(font);
  }, [font]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(LS_THEME_KEY, t);
    } catch {
      // ignore
    }
  }, []);

  const setFont = useCallback((f: FontChoice) => {
    setFontState(f);
    try {
      localStorage.setItem(LS_FONT_KEY, f);
    } catch {
      // ignore
    }
  }, []);

  const setNotify = useCallback((patch: Partial<NotifySettings>) => {
    setNotifyState((prev) => ({ ...prev, ...patch }));
  }, []);

  // よく使うサイトはアカウントのデータ。保存は選考と同じ流れ(下の保存の effect)に乗せる。
  // 以前は端末に1つのキーだったため、同じ端末でアカウントを替えると別の人の一覧が見えていた
  const setQuickLinks = useCallback((next: QuickLink[]) => {
    setQuickLinksState(next);
  }, []);

  const setFontScale = useCallback((scale: number) => {
    const clamped = Math.min(
      FONT_SCALE_MAX,
      Math.max(FONT_SCALE_MIN, Math.round(scale * 100) / 100),
    );
    setFontScaleState(clamped);
    try {
      localStorage.setItem(LS_FONTSCALE_KEY, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  const addPushSubscription = useCallback((sub: PushSubscriptionJSON) => {
    setPushSubscriptions((prev) => {
      if (prev.some((s) => s.endpoint === sub.endpoint)) return prev;
      return [...prev, sub];
    });
  }, []);

  // ---- 未送信(dirty)の端末キャッシュをクラウドへ追従させる ----
  // 端末キャッシュを唯一の真実として読み、オンラインなら送信。成功で dirty を下ろす。
  // オフライン/失敗時は dirty を保ったまま saveState を "offline" にして、復帰時に再送する。
  const flushToCloud = useCallback(async (): Promise<boolean> => {
    if (mode !== "cloud" || !supabase || !user) return false;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSaveState("offline");
      return false;
    }
    const cached = readLocal(cacheKey);
    if (!cached || !cached.dirty) return false;
    // 暗号化済みのクラウドに、鍵を持たないまま書くと中身を壊す。開くまで送らない(dirty のまま残る)
    if (vaultStateRef.current === "locked") return false;
    // 直前がオフライン表示なら「復帰して同期できた瞬間」→ 同期完了アニメ(トースト)を1回出す
    const recovering = saveStateRef.current === "offline";
    const newUpdatedAt = nowISO();
    const base = baseUpdatedAtRef.current;
    try {
      const doc = await encodeDoc(cached);
      // vault 列は、鍵がある時だけ書く(無い時に null で上書きしない)
      const fields: Record<string, unknown> = {
        data: doc.data,
        updated_at: newUpdatedAt,
        ...(doc.vault ? { vault: doc.vault } : {}),
      };
      let wrote = false;
      // 楽観ロック: 自分が最後に読んだ版(base)のままなら上書きする。
      if (base) {
        const { data, error } = await supabase
          .from(DATA_TABLE)
          .update(fields)
          .eq("user_id", user.id)
          .eq("updated_at", base)
          .select("updated_at");
        if (error) throw error;
        if (data && data.length > 0) {
          wrote = true;
          baseUpdatedAtRef.current = (data[0].updated_at as string) || newUpdatedAt;
        }
      }
      if (!wrote) {
        // base 無し(初回) or 不一致(別端末が更新) → 現状を確認
        const cur = await fetchRow();
        if (!cur) {
          // 行が無い → 新規作成
          const { data: ins, error: insErr } = await supabase
            .from(DATA_TABLE)
            .upsert({ user_id: user.id, ...fields })
            .select("updated_at");
          if (insErr) throw insErr;
          baseUpdatedAtRef.current =
            (ins?.[0]?.updated_at as string) || newUpdatedAt;
        } else {
          // 競合: 別端末がクラウドを更新していた。安全側=クラウドを正として取り込む。
          // ただしこの端末の未送信分は復元ポイントに退避してから取り込む(必ず戻せる)。
          pushSnapshot(cacheKey, cached.applications, cached.events);
          const r = await decodeRow(cur, null);
          if (!r) {
            // 別の端末が暗号化に切り替えていて、この端末に鍵が無い。
            // 未送信分は復元ポイントに退避済み。パスワードを入れて開くまで送らない
            return false;
          }
          hydratedRef.current = false;
          setApplications(r.apps);
          if (r.ql) setQuickLinksState(r.ql);
          setEvents(r.evs);
          setNotifyState(r.ntf);
          setPushSubscriptions(r.subs);
          if (r.theme) setTheme(r.theme);
          if (r.font) setFont(r.font);
          baseUpdatedAtRef.current = cur.updated_at || "";
          writeLocal(
            cacheKey,
            {
              applications: r.apps,
              events: r.evs,
              notify: r.ntf,
              pushSubscriptions: r.subs,
              theme: r.theme ?? cached.theme ?? "indigo",
              font: r.font ?? cached.font ?? FONT_DEFAULT,
              savedAt: baseUpdatedAtRef.current || newUpdatedAt,
            },
            false,
          );
          dirtyRef.current = false;
          setSaveState("saved");
          setLastSavedAt(Date.now());
          toast.warning("別の端末の更新を反映しました", {
            description: "この端末の未送信分は『設定 > 復元』から戻せます",
          });
          return false;
        }
      }
      // 送信成功 → 同じ内容で dirty を下ろして記録 + 復元ポイントを退避
      writeLocal(
        cacheKey,
        {
          applications: cached.applications,
          events: cached.events,
          notify: cached.notify,
          pushSubscriptions: cached.pushSubscriptions,
          theme: cached.theme ?? "indigo",
          font: cached.font ?? FONT_DEFAULT,
          savedAt: baseUpdatedAtRef.current || newUpdatedAt,
        },
        false,
      );
      pushSnapshot(cacheKey, cached.applications, cached.events);
      dirtyRef.current = false;
      setSaveState("saved");
      setLastSavedAt(Date.now());
      if (recovering) {
        toast.success("クラウドに同期しました", {
          description: "オフライン中の変更を反映しました",
        });
      }
      return true;
    } catch {
      // ネット不調 → 未送信のまま。エラートーストは出さず(編集ごとに鳴ると煩い)、表示だけ「オフライン」
      setSaveState("offline");
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id, cacheKey]);

  // ---- 手動同期(更新ボタン): 未送信があれば送信、無ければ最新を取得 ----
  const syncNow = useCallback(async () => {
    if (mode !== "cloud" || !supabase || !user) {
      toast.success("この端末に保存済みです");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSaveState("offline");
      toast.info("オフラインです", {
        description: "接続が戻ると自動で同期します",
      });
      return;
    }
    if (dirtyRef.current) {
      const ok = await flushToCloud();
      if (ok) toast.success("同期しました");
      return;
    }
    try {
      const row = await fetchRow();
      if (row) {
        const r = await decodeRow(row, null);
        if (!r) return; // 暗号化済みで鍵が無い → パスワードの画面が出る
        baseUpdatedAtRef.current = row.updated_at;
        hydratedRef.current = false;
        setApplications(r.apps);
          if (r.ql) setQuickLinksState(r.ql);
        setEvents(r.evs);
        setNotifyState(r.ntf);
        setPushSubscriptions(r.subs);
        if (r.theme) setTheme(r.theme);
        if (r.font) setFont(r.font);
        pushSnapshot(cacheKey, r.apps, r.evs);
      }
      setSaveState("saved");
      setLastSavedAt(Date.now());
      toast.success("最新の状態にしました");
    } catch {
      toast.error("同期に失敗しました");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id, flushToCloud]);

  // ---- 初回ロード(モード別) ----
  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    seedTriedRef.current = false;
    setLoaded(false);

    (async () => {
      const cached = readLocal(cacheKey);
      if (cached && !cancelled) {
        setApplications(cached.applications);
        setEvents(cached.events);
        setNotifyState(cached.notify);
        setPushSubscriptions(cached.pushSubscriptions);
        if (cached.theme) setThemeState(cached.theme);
        if (cached.font) setFontState(cached.font);
      }
      // よく使うサイト: 端末だけ(ゲスト)は従来の端末キー、ログイン中はそのアカウントのキャッシュ→クラウド
      if (!cancelled) {
        if (mode === "local" || !supabase || !user) {
          setQuickLinksState(readGuestQuickLinks());
        } else {
          setQuickLinksState(cached?.quickLinks ?? []);
        }
      }

      if (mode === "local" || !supabase || !user) {
        setVaultState("off");
        dekRef.current = null;
        keysRef.current = null;
        if (!cancelled) setLoaded(true);
        return;
      }

      try {
        // ログイン直後ならパスワードが1度だけ受け取れる(鍵を作る/開く用。保存しない)
        const password = peekPendingPassword();
        dekRef.current = null;
        keysRef.current = null;
        const row = await fetchRow();
        if (cancelled) return;
        const remoteUpdatedAt: string = row?.updated_at ?? "";

        // 鍵の用意は、送る前に必ず済ませる(鍵の無いまま送ると暗号文を平文で上書きしうる)
        let decoded: Decoded | null = null;
        if (row) {
          decoded = await decodeRow(row, password);
          if (cancelled) return;
          if (!decoded) {
            // 暗号化済みでこの端末に鍵が無い → パスワードの画面へ。中身は出さない
            hydratedRef.current = false;
            setApplications([]);
            setEvents([]);
            return;
          }
        } else if (vaultColRef.current && password) {
          // 初めてのクラウド(新規登録直後など): 最初の保存から暗号化して送る
          const dek = generateDek();
          keysRef.current = await wrapDek(dek, password);
          dekRef.current = dek;
          saveLocalDek(user.id, dek);
          setVaultState("ready");
        } else {
          setVaultState(vaultColRef.current ? "setup" : "off");
        }
        // 平文のクラウドに鍵ができた = 暗号化へ移す必要がある
        const needsMigration =
          !!row && !isVaultColumn(row.vault) && vaultStateRef.current === "ready";

        // 端末に未送信(dirty)の編集があるなら「新しい方を採用」。
        // ローカルが新しければ表示を保持してクラウドを追従させる(リロード時の巻き戻し防止)。
        // 楽観ロックの基準: 今読んだクラウドの版を記録
        baseUpdatedAtRef.current = remoteUpdatedAt;

        if (cached?.dirty) {
          const localNewer =
            !remoteUpdatedAt ||
            (!!cached.savedAt && cached.savedAt >= remoteUpdatedAt);
          if (localNewer) {
            dirtyRef.current = true;
            if (!cancelled) setLoaded(true);
            await flushToCloud();
            return;
          }
          // クラウドの方が新しい → 以降でクラウドを適用(ローカル編集は破棄)。
          // 破棄前に復元ポイントへ退避し、他端末の更新を優先したことを知らせる。
          if (!cancelled) {
            pushSnapshot(cacheKey, cached.applications, cached.events);
            dirtyRef.current = false;
            toast.warning("別の端末の更新を反映しました", {
              description:
                "この端末の変更は『設定 > 復元』から戻せます",
            });
          }
        }

        if (decoded && (Array.isArray(row?.data) || (row?.data && typeof row.data === "object"))) {
          const { apps, evs, ntf, subs } = decoded;
          setApplications(apps);
          if (decoded.ql) setQuickLinksState(decoded.ql);
          setEvents(evs);
          setNotifyState(ntf);
          setPushSubscriptions(subs);
          if (decoded.theme) setTheme(decoded.theme);
          if (decoded.font) setFont(decoded.font);
          // クラウドを正として採用 → 端末キャッシュを clean 同期(次回起動の判定基準を揃える)。
          // 暗号化へ移す時は dirty で書いて、このあと送る
          writeLocal(
            cacheKey,
            {
              applications: apps,
              events: evs,
              notify: ntf,
              pushSubscriptions: subs,
              theme: decoded.theme ?? cached?.theme ?? "indigo",
              font: decoded.font ?? cached?.font ?? FONT_DEFAULT,
              savedAt: remoteUpdatedAt || nowISO(),
              quickLinks: decoded.ql ?? cached?.quickLinks ?? [],
            },
            needsMigration,
          );
          // 読み込んだクラウド状態を復元ポイントと毎日のバックアップに退避
          pushSnapshot(cacheKey, apps, evs);
          void saveDailyBackup(cacheKey, apps, evs);
          if (needsMigration) {
            dirtyRef.current = true;
            if (!cancelled) setLoaded(true);
            await flushToCloud();
            return;
          }
        } else {
          // クラウドが空 → ローカルのキャッシュ/レガシーを移行(送る形は flushToCloud が作る=暗号化も効く)
          const legacy = cached ?? readLocal(LS_KEY);
          if (legacy && legacy.applications.length > 0) {
            setApplications(legacy.applications);
            setQuickLinksState(readGuestQuickLinks());
            setEvents(legacy.events);
            writeLocal(
              cacheKey,
              {
                applications: legacy.applications,
                events: legacy.events,
                notify: legacy.notify,
                pushSubscriptions: legacy.pushSubscriptions,
                theme: legacy.theme ?? "indigo",
                font: legacy.font ?? FONT_DEFAULT,
                savedAt: nowISO(),
                quickLinks: readGuestQuickLinks(),
              },
              true,
            );
            dirtyRef.current = true;
            if (!cancelled) setLoaded(true);
            await flushToCloud();
            return;
          } else {
            setApplications([]);
            setEvents([]);
          }
        }
      } catch (e) {
        toast.error("クラウドからの読み込みに失敗しました", {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id]);

  // ---- 変更を 600ms デバウンスで保存 ----
  useEffect(() => {
    if (!loaded) return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    // 鍵が無くて中身を出していない間は、空の状態で端末キャッシュを上書きしない
    if (vaultStateRef.current === "locked") return;
    dirtyRef.current = true;
    setSaveState("saving");
    const isCloud = mode === "cloud" && !!supabase && !!user;
    const payload: CachePayload = {
      applications,
      events,
      notify,
      pushSubscriptions,
      theme,
      font,
      savedAt: nowISO(),
      quickLinks,
    };
    const t = window.setTimeout(() => {
      if (!isCloud) {
        try {
          localStorage.setItem(LS_QUICKLINKS_KEY, JSON.stringify(quickLinks));
        } catch {
          // ignore
        }
      }
      // (1) まず端末に保存。オフラインでも必ず成功させ「見た目の編集」を確定させる。
      //     クラウド利用時は dirty=true で記録し、送信できるまで未送信として残す。
      writeLocal(cacheKey, payload, isCloud);
      // 毎日の自動バックアップ(端末・その日の最後の状態を1つ・30日分)
      void saveDailyBackup(cacheKey, payload.applications, payload.events);
      if (!isCloud) {
        // ローカルモードは端末保存で完結
        dirtyRef.current = false;
        setSaveState("saved");
        setLastSavedAt(Date.now());
        return;
      }
      // (2) クラウドへ追従。失敗(オフライン)時は dirty のまま → 復帰時に自動再送。
      void flushToCloud();
    }, 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    applications,
    events,
    notify,
    pushSubscriptions,
    theme,
    font,
    quickLinks,
    loaded,
    mode,
    user?.id,
    cacheKey,
    flushToCloud,
  ]);

  // ---- 復帰時の同期: 未送信があれば送信(flush)、無ければ他端末の更新を取り込む(pull) ----
  useEffect(() => {
    if (mode !== "cloud" || !supabase || !user) return;
    const sync = async () => {
      if (document.visibilityState === "hidden") return;
      // 未送信のローカル編集があるなら、まず送信して追いつかせる(pull で上書きしない)
      if (dirtyRef.current) {
        await flushToCloud();
        return;
      }
      // 鍵が無くて閉じている間は取り込まない(パスワードの画面で開いた時に読み直す)
      if (vaultStateRef.current === "locked") return;
      let row: RemoteRow | null = null;
      try {
        row = await fetchRow();
      } catch {
        return;
      }
      if (!row) return;
      const r = await decodeRow(row, null);
      if (!r) return;
      baseUpdatedAtRef.current = row.updated_at;
      hydratedRef.current = false;
      setApplications(r.apps);
          if (r.ql) setQuickLinksState(r.ql);
      setEvents(r.evs);
      setNotifyState(r.ntf);
      setPushSubscriptions(r.subs);
      if (r.theme) setTheme(r.theme);
      if (r.font) setFont(r.font);
    };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("online", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("online", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id, flushToCloud]);

  // ---- アプリアイコンの赤バッジ: 直近1週間の件数。対応端末(インストール済みPWA)のみ ----
  useEffect(() => {
    if (!loaded) return;
    const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
    if (!nav || !("setAppBadge" in nav)) return;
    const apply = () => {
      const n = badgeCount(applications, events);
      if (n > 0) nav.setAppBadge?.(n).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    };
    apply();
    // 時間経過で締切が近づくため、復帰時に再計算する
    window.addEventListener("focus", apply);
    document.addEventListener("visibilitychange", apply);
    return () => {
      window.removeEventListener("focus", apply);
      document.removeEventListener("visibilitychange", apply);
    };
  }, [applications, events, loaded]);

  const mutateApp = useCallback(
    (id: string, fn: (app: Application) => Application) => {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...fn(a), updatedAt: nowISO() } : a)),
      );
    },
    [],
  );

  const addApplication = useCallback((input: NewApplicationInput) => {
    const id = newId();
    const ts = nowISO();
    const app: Application = {
      id,
      company: input.company.trim(),
      role: input.role.trim(),
      priority: input.priority,
      result: input.result ?? "in_progress",
      selectionType: input.selectionType,
      venueMode: "",
      venuePlace: "",
      links: [],
      esEntries: [],
      memo: "",
      steps: [],
      stages: [],
      createdAt: ts,
      updatedAt: ts,
    };
    setApplications((prev) => [app, ...prev]);
    return id;
  }, []);

  const updateApplication = useCallback<StoreValue["updateApplication"]>(
    (id, patch) => mutateApp(id, (a) => ({ ...a, ...patch })),
    [mutateApp],
  );

  const deleteApplication = useCallback((id: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addStep = useCallback<StoreValue["addStep"]>(
    (appId, kind = "es") => {
      const step = makeStep(kind);
      mutateApp(appId, (a) => ({ ...a, steps: [...a.steps, step] }));
      return step.id;
    },
    [mutateApp],
  );

  const addStepsBulk = useCallback<StoreValue["addStepsBulk"]>(
    (appId, kinds) =>
      mutateApp(appId, (a) => ({
        ...a,
        steps: [...a.steps, ...kinds.map((k) => makeStep(k))],
      })),
    [mutateApp],
  );

  const replaceSteps = useCallback<StoreValue["replaceSteps"]>(
    (appId, kinds) =>
      mutateApp(appId, (a) => ({
        ...a,
        steps: kinds.map((k) => makeStep(k)),
      })),
    [mutateApp],
  );

  const updateStep = useCallback<StoreValue["updateStep"]>(
    (appId, stepId, patch) =>
      mutateApp(appId, (a) => ({
        ...a,
        steps: a.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
      })),
    [mutateApp],
  );

  const deleteStep = useCallback<StoreValue["deleteStep"]>(
    (appId, stepId) =>
      mutateApp(appId, (a) => ({
        ...a,
        steps: a.steps.filter((s) => s.id !== stepId),
      })),
    [mutateApp],
  );

  const moveStep = useCallback<StoreValue["moveStep"]>(
    (appId, stepId, dir) =>
      mutateApp(appId, (a) => {
        const idx = a.steps.findIndex((s) => s.id === stepId);
        const next = idx + dir;
        if (idx < 0 || next < 0 || next >= a.steps.length) return a;
        const steps = [...a.steps];
        [steps[idx], steps[next]] = [steps[next], steps[idx]];
        return { ...a, steps };
      }),
    [mutateApp],
  );

  const setStepOrder = useCallback<StoreValue["setStepOrder"]>(
    (appId, orderedIds) =>
      mutateApp(appId, (a) => {
        const byId = new Map(a.steps.map((s) => [s.id, s]));
        const steps = orderedIds
          .map((id) => byId.get(id))
          .filter((s): s is SelectionStep => !!s);
        // 取りこぼし防止
        for (const s of a.steps) if (!orderedIds.includes(s.id)) steps.push(s);
        return { ...a, steps };
      }),
    [mutateApp],
  );

  // ---- 段階 ＞ タスク (新モデル) ----
  // 段階を変更したら全体結果(app.result)を段階から再導出して常に整合させる。
  const mutateStages = useCallback(
    (appId: string, fn: (stages: SelectionStage[]) => SelectionStage[]) =>
      mutateApp(appId, (a) => {
        const stages = fn(a.stages);
        return { ...a, stages, result: deriveResult(stages) };
      }),
    [mutateApp],
  );

  const addStage = useCallback<StoreValue["addStage"]>(
    (appId, kind = "es") => {
      const stage = makeStage(kind);
      mutateStages(appId, (stages) => [...stages, stage]);
      return stage.tasks[0]?.id;
    },
    [mutateStages],
  );

  const deleteStage = useCallback<StoreValue["deleteStage"]>(
    (appId, stageId) =>
      mutateStages(appId, (stages) =>
        stages.filter((s) => s.id !== stageId),
      ),
    [mutateStages],
  );

  const moveStage = useCallback<StoreValue["moveStage"]>(
    (appId, stageId, dir) =>
      mutateStages(appId, (stages) => {
        const idx = stages.findIndex((s) => s.id === stageId);
        const next = idx + dir;
        if (idx < 0 || next < 0 || next >= stages.length) return stages;
        const out = [...stages];
        [out[idx], out[next]] = [out[next], out[idx]];
        return out;
      }),
    [mutateStages],
  );

  const setStageResult = useCallback<StoreValue["setStageResult"]>(
    (appId, stageId, result) =>
      mutateStages(appId, (stages) =>
        stages.map((s) => (s.id === stageId ? { ...s, result } : s)),
      ),
    [mutateStages],
  );

  const addTask = useCallback<StoreValue["addTask"]>(
    (appId, stageId, kind = "es") => {
      const task = makeTask(kind);
      mutateStages(appId, (stages) =>
        stages.map((s) =>
          s.id === stageId ? { ...s, tasks: [...s.tasks, task] } : s,
        ),
      );
      return task.id;
    },
    [mutateStages],
  );

  const updateTask = useCallback<StoreValue["updateTask"]>(
    (appId, stageId, taskId, patch) =>
      mutateStages(appId, (stages) =>
        stages.map((s) =>
          s.id === stageId
            ? {
                ...s,
                tasks: s.tasks.map((t) =>
                  t.id === taskId ? { ...t, ...patch } : t,
                ),
              }
            : s,
        ),
      ),
    [mutateStages],
  );

  const deleteTask = useCallback<StoreValue["deleteTask"]>(
    (appId, stageId, taskId) =>
      mutateStages(appId, (stages) =>
        // 段階の最後の1タスクを消す場合は段階ごと削除(段階は必ず1タスク以上)
        stages
          .map((s) =>
            s.id === stageId
              ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }
              : s,
          )
          .filter((s) => s.tasks.length > 0),
      ),
    [mutateStages],
  );

  const toggleTaskDone = useCallback<StoreValue["toggleTaskDone"]>(
    (appId, stageId, taskId) =>
      mutateStages(appId, (stages) =>
        stages.map((s) =>
          s.id === stageId
            ? {
                ...s,
                tasks: s.tasks.map((t) =>
                  t.id === taskId ? advanceTaskState(t) : t,
                ),
              }
            : s,
        ),
      ),
    [mutateStages],
  );

  const addStagesBulk = useCallback<StoreValue["addStagesBulk"]>(
    (appId, kinds) =>
      mutateStages(appId, (stages) => [
        ...stages,
        ...kinds.map((k) => makeStage(k)),
      ]),
    [mutateStages],
  );

  const replaceStages = useCallback<StoreValue["replaceStages"]>(
    (appId, kinds) =>
      mutateStages(appId, () => kinds.map((k) => makeStage(k))),
    [mutateStages],
  );

  const addLink = useCallback<StoreValue["addLink"]>(
    (appId) => {
      const link: RelatedLink = { id: newId(), label: "", url: "" };
      mutateApp(appId, (a) => ({ ...a, links: [...a.links, link] }));
      return link.id;
    },
    [mutateApp],
  );

  const updateLink = useCallback<StoreValue["updateLink"]>(
    (appId, linkId, patch) =>
      mutateApp(appId, (a) => ({
        ...a,
        links: a.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
      })),
    [mutateApp],
  );

  const deleteLink = useCallback<StoreValue["deleteLink"]>(
    (appId, linkId) =>
      mutateApp(appId, (a) => ({
        ...a,
        links: a.links.filter((l) => l.id !== linkId),
      })),
    [mutateApp],
  );

  const addEsEntry = useCallback<StoreValue["addEsEntry"]>(
    (appId) => {
      const entry: ESEntry = {
        id: newId(),
        question: "",
        answer: "",
        charLimit: null,
      };
      mutateApp(appId, (a) => ({ ...a, esEntries: [...a.esEntries, entry] }));
      return entry.id;
    },
    [mutateApp],
  );

  const updateEsEntry = useCallback<StoreValue["updateEsEntry"]>(
    (appId, entryId, patch) =>
      mutateApp(appId, (a) => ({
        ...a,
        esEntries: a.esEntries.map((e) =>
          e.id === entryId ? { ...e, ...patch } : e,
        ),
      })),
    [mutateApp],
  );

  const deleteEsEntry = useCallback<StoreValue["deleteEsEntry"]>(
    (appId, entryId) =>
      mutateApp(appId, (a) => ({
        ...a,
        esEntries: a.esEntries.filter((e) => e.id !== entryId),
      })),
    [mutateApp],
  );

  const replaceAll = useCallback((apps: Application[]) => {
    setApplications(apps);
  }, []);

  const mergeImport = useCallback<StoreValue["mergeImport"]>((apps, evs) => {
    // 先頭id(選考/イベント)は振り直し、再取り込みでも既存keyと衝突させない
    if (apps.length) {
      setApplications((prev) => [
        ...apps.map((a) => ({ ...a, id: newId() })),
        ...prev,
      ]);
    }
    if (evs.length) {
      setEvents((prev) => [...evs.map((e) => ({ ...e, id: newId() })), ...prev]);
    }
  }, []);

  const restoreFromRaw = useCallback<StoreValue["restoreFromRaw"]>((raw) => {
    try {
      const parsed = JSON.parse(raw);
      const apps = Array.isArray(parsed) ? parsed : parsed?.applications;
      if (!Array.isArray(apps)) return false;
      // normalizeApps が旧stepsから段階を作り直す(=移行前データもそのまま使える)
      setApplications(normalizeApps(apps));
      setEvents(normalizeEvents(parsed?.events));
      return true;
    } catch {
      return false;
    }
  }, []);

  const listLocalSnapshots = useCallback<StoreValue["listLocalSnapshots"]>(
    () => listSnapshots(cacheKey),
    [cacheKey],
  );

  const listDailyBackups = useCallback<StoreValue["listDailyBackups"]>(
    () => listDailyBackupsIdb(cacheKey),
    [cacheKey],
  );

  const unlockVault = useCallback<StoreValue["unlockVault"]>(
    async (password) => {
      if (mode !== "cloud" || !supabase || !user || !password) return false;
      let row: RemoteRow | null;
      try {
        row = await fetchRow();
      } catch {
        return false;
      }
      if (row && isVaultColumn(row.vault)) {
        // 暗号化済み: 包んだ鍵をパスワードで開く(違えば GCM の検証で落ちる)
        const r = await decodeRow(row, password);
        if (!r) return false;
        baseUpdatedAtRef.current = row.updated_at;
        hydratedRef.current = false;
        setApplications(r.apps);
          if (r.ql) setQuickLinksState(r.ql);
        setEvents(r.evs);
        setNotifyState(r.ntf);
        setPushSubscriptions(r.subs);
        if (r.theme) setTheme(r.theme);
        if (r.font) setFont(r.font);
        writeLocal(
          cacheKey,
          {
            applications: r.apps,
            events: r.evs,
            notify: r.ntf,
            pushSubscriptions: r.subs,
            theme: r.theme ?? theme,
            font: r.font ?? font,
            savedAt: row.updated_at || nowISO(),
          },
          false,
        );
        pushSnapshot(cacheKey, r.apps, r.evs);
        void saveDailyBackup(cacheKey, r.apps, r.evs);
        return true;
      }
      if (!vaultColRef.current) return false;
      // 平文のクラウド: 打ち間違えたパスワードで鍵を包むと、ほかの端末で二度と開けない。
      // 先にログインのパスワードとして正しいかを確かめる
      if (!user.email) return false;
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (error) return false;
      const dek = generateDek();
      keysRef.current = await wrapDek(dek, password);
      dekRef.current = dek;
      saveLocalDek(user.id, dek);
      setVaultState("ready");
      // 今の中身を暗号化して送り直す(クラウドの平文を置き換える)
      const cached = readLocal(cacheKey);
      if (row && cached) {
        writeLocal(
          cacheKey,
          {
            applications: cached.applications,
            events: cached.events,
            notify: cached.notify,
            pushSubscriptions: cached.pushSubscriptions,
            theme: cached.theme ?? theme,
            font: cached.font ?? font,
            savedAt: nowISO(),
          },
          true,
        );
        dirtyRef.current = true;
        await flushToCloud();
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, user?.id, cacheKey, flushToCloud, theme, font],
  );

  const clearAll = useCallback(() => {
    setApplications([]);
    setEvents([]);
  }, []);

  const mutateEvent = useCallback(
    (id: string, fn: (e: EventItem) => EventItem) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...fn(e), updatedAt: nowISO() } : e)),
      );
    },
    [],
  );

  const addEvent = useCallback<StoreValue["addEvent"]>((input) => {
    const id = newId();
    const ts = nowISO();
    const ev: EventItem = {
      id,
      company: input.company.trim(),
      title: input.title.trim(),
      venueMode: "",
      venuePlace: "",
      applyBy: null,
      applyDone: false,
      heldAt: null,
      links: [],
      memo: "",
      status: "todo",
      createdAt: ts,
      updatedAt: ts,
    };
    setEvents((prev) => [ev, ...prev]);
    return id;
  }, []);

  const updateEvent = useCallback<StoreValue["updateEvent"]>(
    (id, patch) => mutateEvent(id, (e) => ({ ...e, ...patch })),
    [mutateEvent],
  );

  const deleteEvent = useCallback<StoreValue["deleteEvent"]>((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addEventLink = useCallback<StoreValue["addEventLink"]>(
    (id) => {
      const link: RelatedLink = { id: newId(), label: "", url: "" };
      mutateEvent(id, (e) => ({ ...e, links: [...e.links, link] }));
      return link.id;
    },
    [mutateEvent],
  );

  const updateEventLink = useCallback<StoreValue["updateEventLink"]>(
    (id, linkId, patch) =>
      mutateEvent(id, (e) => ({
        ...e,
        links: e.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
      })),
    [mutateEvent],
  );

  const deleteEventLink = useCallback<StoreValue["deleteEventLink"]>(
    (id, linkId) =>
      mutateEvent(id, (e) => ({
        ...e,
        links: e.links.filter((l) => l.id !== linkId),
      })),
    [mutateEvent],
  );

  const seedSampleIfEmpty = useCallback((): boolean => {
    // (1) クラウド取得完了まで投入しない
    if (!loaded) return false;
    // 同一マウントでの二重発火を防ぐ
    if (seedTriedRef.current) return false;
    // (2) シード済みフラグ(ユーザー別に分離)があればスキップ=全削除後も再湧きしない
    const seededKey =
      mode === "cloud" && user ? `${LS_SEEDED_KEY}:${user.id}` : LS_SEEDED_KEY;
    let already = false;
    try {
      already = !!localStorage.getItem(seededKey);
    } catch {
      // ignore
    }
    if (already) return false;
    seedTriedRef.current = true;
    try {
      localStorage.setItem(seededKey, "1");
    } catch {
      // ignore
    }
    // (3) 関数形で prev.length を再判定 → 既存データがあれば絶対に上書きしない最終防御
    let didSeed = false;
    setApplications((prev) => {
      if (prev.length > 0) return prev;
      didSeed = true;
      // サンプルも normalizeApps を通して stages を補完(移行ロジックで生成)
      return normalizeApps(buildSampleApplications());
    });
    return didSeed;
  }, [loaded, mode, user?.id]);

  const value: StoreValue = {
    loaded,
    applications,
    saveState,
    lastSavedAt,
    syncNow,
    theme,
    setTheme,
    font,
    setFont,
    notify,
    setNotify,
    quickLinks,
    setQuickLinks,
    fontScale,
    setFontScale,
    pushSubscriptions,
    addPushSubscription,
    addApplication,
    updateApplication,
    deleteApplication,
    addStep,
    addStepsBulk,
    replaceSteps,
    updateStep,
    deleteStep,
    moveStep,
    setStepOrder,
    addStage,
    deleteStage,
    moveStage,
    setStageResult,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskDone,
    addStagesBulk,
    replaceStages,
    addLink,
    updateLink,
    deleteLink,
    addEsEntry,
    updateEsEntry,
    deleteEsEntry,
    replaceAll,
    mergeImport,
    restoreFromRaw,
    listLocalSnapshots,
    listDailyBackups,
    vaultState,
    unlockVault,
    clearAll,
    seedSampleIfEmpty,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    addEventLink,
    updateEventLink,
    deleteEventLink,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore は StoreProvider の中で使ってください");
  return ctx;
}
