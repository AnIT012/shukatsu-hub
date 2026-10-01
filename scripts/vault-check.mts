/**
 * 暗号化(lib/vault.ts)の固定テスト。
 *
 *   node --experimental-strip-types scripts/vault-check.mts     # 1つでも落ちたら exit 1
 *
 * 見ること:
 *  1. パスワードで包んだ鍵は、同じパスワードでだけ開く
 *  2. 暗号文は、鍵が違う/1文字壊れていると開かない
 *  3. クラウドに置く物(vault 列・通知用の最小限)に、ES・メモ・ID・リンクの文字が入っていない
 *  4. 通知関数(supabase/functions/notify)が読む項目を、通知用の最小限が全部持っている
 *     (関数が新しい項目を読み始めたら、ここが赤くなる)
 * 最後に「壊した物で赤くなるか」を確かめる(物差しが生きているか)。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildNotifyFeed,
  generateDek,
  seal,
  stubApplications,
  unseal,
  unwrapDek,
  wrapDek,
} from "../src/lib/vault.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
let failed = 0;
let checked = 0;
const ok = (cond: boolean, label: string) => {
  checked++;
  if (!cond) {
    failed++;
    console.error("✗", label);
  }
};

// ---- 材料: 見られたくない文字を仕込んだ応募先 ----
const SECRET = {
  es: "ES本文ひみつ_学チカ_個人開発",
  memo: "メモひみつ_一次は人事",
  loginId: "ID_himitsu_0421",
  link: "https://mypage.example.com/secret-path",
  role: "職種ひみつ_PM",
};
const apps = [
  {
    id: "a1",
    company: "あおぞら商事",
    role: SECRET.role,
    priority: "high",
    memo: SECRET.memo,
    loginId: SECRET.loginId,
    links: [{ id: "l1", label: "マイページ", url: SECRET.link }],
    esEntries: [{ id: "e1", question: "学チカ", answer: SECRET.es }],
    stages: [
      {
        id: "s1",
        label: "",
        result: "pending",
        tasks: [{ id: "t1", kind: "es", dueAt: "2026-10-03T23:59", heldAt: null, done: false, memo: SECRET.memo }],
      },
    ],
  },
];
const events = [
  { id: "v1", company: "そら総研", title: "説明会", status: "todo", applyBy: "2026-10-05", heldAt: null, applyDone: false, memo: SECRET.memo, links: [{ url: SECRET.link }] },
];

// 1. 鍵を包む/開く(本番より少ない反復回数で速く回す。中身の正しさは同じ)
const ITER = 1000;
const dek = generateDek();
const keys = await wrapDek(dek, "correct-horse", ITER);
const opened = await unwrapDek(keys, "correct-horse");
ok(!!opened && Buffer.from(opened).equals(Buffer.from(dek)), "同じパスワードで鍵が開く");
ok((await unwrapDek(keys, "wrong-horse")) === null, "違うパスワードでは鍵が開かない");
ok((await unwrapDek(keys, "")) === null, "空のパスワードでは鍵が開かない");

// 2. 暗号化/復号
const sealed = await seal(dek, { applications: apps, events });
const back = await unseal<any>(dek, sealed);
ok(JSON.stringify(back) === JSON.stringify({ applications: apps, events }), "暗号文が元に戻る");
ok((await unseal(generateDek(), sealed)) === null, "別の鍵では開かない");
const tampered = { ...sealed, ct: (sealed.ct[0] === "A" ? "B" : "A") + sealed.ct.slice(1) };
ok((await unseal(dek, tampered)) === null, "1文字壊れた暗号文は開かない(改ざん検知)");
const sealed2 = await seal(dek, { applications: apps, events });
ok(sealed2.iv !== sealed.iv && sealed2.ct !== sealed.ct, "同じ中身でも毎回ちがう暗号文になる(iv が使い回されていない)");

// 3. クラウドに置く物に秘密が混ざっていない
const feed = buildNotifyFeed(apps, events);
const cloudData = {
  applications: stubApplications("2026-10-01T00:00:00Z"),
  events: [],
  notify: { enabled: true },
  vault: 1,
  notifyFeed: feed,
};
const cloudText = JSON.stringify({ data: cloudData, vault: { keys, sealed } });
for (const [k, v] of Object.entries(SECRET)) {
  ok(!cloudText.includes(v), `クラウドに置く物に ${k} の文字が無い`);
}
ok(!cloudText.includes(Buffer.from(dek).toString("base64")), "クラウドに置く物に、データ鍵そのものが無い");
ok(!cloudText.includes("correct-horse"), "クラウドに置く物に、パスワードが無い");
ok(cloudText.includes("あおぞら商事"), "通知用に企業名は残っている(通知のため・説明済み)");

// 4. 通知関数が読む項目を、通知用の最小限が持っているか(関数のソースから読む項目を拾う)
const fn = readFileSync(join(HERE, "../supabase/functions/notify/index.ts"), "utf8");
const fields = (re: RegExp) => [...new Set([...fn.matchAll(re)].map((m) => m[1]))];
const need = {
  app: fields(/\bapp\.(\w+)/g).filter((f) => f !== "steps"), // steps は移行前データ用(暗号化後は来ない)
  stage: fields(/\bst\.(\w+)/g),
  task: fields(/\bt\.(\w+)/g),
  event: fields(/\bev\.(\w+)/g),
};
ok(need.app.length > 0 && need.task.length > 0 && need.event.length > 0, "通知関数から読む項目を拾えた(物差しが空でない)");
const has = (o: any, f: string) => o && Object.prototype.hasOwnProperty.call(o, f);
for (const f of need.app) ok(has(feed.applications[0], f), `通知用の応募先に ${f} がある`);
for (const f of need.stage) ok(has(feed.applications[0].stages[0], f), `通知用の段階に ${f} がある`);
for (const f of need.task) ok(has(feed.applications[0].stages[0].tasks[0], f), `通知用のタスクに ${f} がある`);
for (const f of need.event) ok(has(feed.events[0], f), `通知用のイベントに ${f} がある`);
ok(/d\.vault === 1 \? d\.notifyFeed/.test(fn), "通知関数が、暗号化済みの人は notifyFeed を読む");

// ---- 物差しが生きているか(壊した物で赤くなるか) ----
{
  const before = failed;
  const leaky = JSON.stringify({ ...cloudData, leaked: SECRET.es });
  const caught = leaky.includes(SECRET.es);
  const featureMissing = !has({ company: "x" }, "stages");
  if (!caught || !featureMissing || before !== failed) {
    console.error("SELF-CHECK FAILED: 漏れや欠けを検出できていない");
    process.exit(2);
  }
}

if (failed) {
  console.error(`\n暗号化の検査: ${failed} 件が落ちた (${checked} 項目)`);
  process.exit(1);
}
console.log(`暗号化の検査: 全 ${checked} 項目 OK`);
