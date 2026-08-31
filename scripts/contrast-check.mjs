/**
 * コントラスト固定テスト (WCAG AA)。
 * globals.css の :root と全 [data-theme] のトークンを読み、
 * 「決めた配色が AA を割っていないか」を機械で見張る(tests-as-guardrails)。
 *
 *   node scripts/contrast-check.mjs        # 全ペアを検査。1つでも割れたら exit 1
 *
 * 目視では気づけない(コントラスト比・輝度)を測るのが目的。色を触ったら必ず走らせる。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(HERE, "../src/app/globals.css"), "utf8");

// ---- 色計算 ----
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255));
}
function relLum([r, g, b]) {
  const c = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const la = relLum(a), lb = relLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function parseHsl(str) {
  const m = str.trim().match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  return hslToRgb(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
}

// ---- 物差しが生きているか(逆テスト) ----
// #767676 on #fff = 4.54(AA境界のすぐ上) / #777 on #fff ≈ 4.48(割れる)。ここがズレたら計算が壊れている。
{
  const near = contrast([0x76, 0x76, 0x76], [255, 255, 255]);
  if (!(near > 4.5 && near < 4.6)) {
    console.error("SELF-CHECK FAILED: contrast()の値がおかしい:", near);
    process.exit(2);
  }
}

// ---- トークン抽出 ----
function varsIn(block) {
  const map = {};
  for (const m of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) map[m[1]] = m[2].trim();
  return map;
}
const rootBody = CSS.match(/:root\s*\{([\s\S]*?)\n  \}/)[1];
const root = varsIn(rootBody);
const themes = { indigo: { ...root } };
for (const m of CSS.matchAll(/\[data-theme="(\w+)"\]\s*\{([\s\S]*?)\n  \}/g)) {
  themes[m[1]] = { ...root, ...varsIn(m[2]) }; // 未定義は:rootから継承
}

// ---- 検査するペア(前景トークン, 背景トークン, 閾値, 説明) ----
const PAIRS = [
  ["--foreground", "--background", 4.5, "本文 on 紙"],
  ["--foreground", "--card", 4.5, "本文 on カード"],
  ["--muted-foreground", "--background", 4.5, "添え字 on 紙"],
  ["--muted-foreground", "--card", 4.5, "添え字 on カード"],
  ["--primary-foreground", "--primary", 4.5, "主ボタンの字 on アクセント"],
  ["--accent-foreground", "--accent", 4.5, "藍字 on 藍タグ"],
  ["--danger-foreground", "--danger", 4.5, "白 on 危険地"],
  ["--danger", "--card", 4.5, "危険字(締切) on カード"],
  ["--success", "--card", 4.5, "成功字 on カード"],
  ["--warning", "--card", 4.5, "注意字 on カード"],
  ["--primary", "--card", 3.0, "アクセント面/字 on カード(UI 3:1)"],
];

let failed = 0, checked = 0;
for (const [name, vars] of Object.entries(themes)) {
  for (const [fg, bg, min, label] of PAIRS) {
    const c1 = parseHsl(vars[fg]), c2 = parseHsl(vars[bg]);
    if (!c1 || !c2) { console.error(`[${name}] 変数欠落: ${fg} or ${bg}`); failed++; continue; }
    const ratio = contrast(c1, c2);
    checked++;
    if (ratio < min) {
      failed++;
      console.error(`✗ [${name}] ${label}: ${ratio.toFixed(2)} < ${min}  (${fg} ${vars[fg]} / ${bg} ${vars[bg]})`);
    }
  }
}

if (failed) {
  console.error(`\nAA 検査: ${failed} 件が閾値を割った (${checked} ペア検査)`);
  process.exit(1);
}
console.log(`AA 検査: 全 ${checked} ペア OK (${Object.keys(themes).length} テーマ)`);
