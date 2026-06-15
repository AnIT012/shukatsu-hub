// 締切・日付まわりのユーティリティ。
// dueAt は "YYYY-MM-DD"(日付のみ) もしくは "YYYY-MM-DDTHH:mm"(日時) の文字列。

export type Urgency = "overdue" | "soon" | "near" | "none";

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];
const DAY_MS = 86_400_000;

export function hasTime(due: string | null): boolean {
  return !!due && due.includes("T");
}

/** dueAt を「ローカル時刻の Date」に変換(日付のみはその日の0時) */
export function dueToDate(due: string | null): Date | null {
  if (!due) return null;
  if (due.includes("T")) {
    const d = new Date(due); // タイムゾーン無し → ローカル解釈
    return isNaN(d.getTime()) ? null : d;
  }
  const [y, m, d] = due.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** 並び替え用の絶対時刻(ms)。日付のみはその日の終わり(23:59)として扱う。 */
export function dueInstant(due: string | null): number | null {
  const d = dueToDate(due);
  if (!d) return null;
  if (!hasTime(due)) {
    return new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
      999,
    ).getTime();
  }
  return d.getTime();
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** 今日からの「日数差」。0=今日, 1=明日, -1=昨日(過ぎている) */
export function dayDiffFromToday(due: string | null): number | null {
  const d = dueToDate(due);
  if (!d) return null;
  const today0 = startOfDay(new Date());
  const due0 = startOfDay(d);
  return Math.round((due0 - today0) / DAY_MS);
}

/** 締切の緊急度(完了済みステップでは呼ばない想定) */
export function urgencyOf(due: string | null): Urgency {
  const inst = dueInstant(due);
  if (inst === null) return "none";
  const now = Date.now();
  if (inst < now) return "overdue";
  const diff = dayDiffFromToday(due);
  if (diff === null) return "none";
  if (diff <= 3) return "soon";
  if (diff <= 7) return "near";
  return "none";
}

/** "6/23(月)" / "6/23(月) 14:00" */
export function formatDue(due: string | null): string {
  const d = dueToDate(due);
  if (!d) return "";
  const base = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY[d.getDay()]})`;
  if (!hasTime(due)) return base;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${base} ${hh}:${mm}`;
}

/** "今日" / "明日" / "あと3日" / "2日超過" など */
export function relativeLabel(due: string | null): string {
  const inst = dueInstant(due);
  if (inst === null) return "";
  const diff = dayDiffFromToday(due);
  if (diff === null) return "";
  if (inst < Date.now()) {
    const over = -diff;
    return over <= 0 ? "期限超過" : `${over}日超過`;
  }
  if (diff === 0) return "今日";
  if (diff === 1) return "明日";
  if (diff === 2) return "明後日";
  return `あと${diff}日`;
}

/** 今週末(日曜 23:59)の絶対時刻。週は月曜始まり。 */
export function endOfThisWeek(): number {
  const now = new Date();
  const day = now.getDay(); // 0=日 .. 6=土
  const daysUntilSun = (7 - day) % 7;
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilSun,
    23,
    59,
    59,
    999,
  ).getTime();
}

/** 今週締切 もしくは 期限切れ(=今すぐ手を打つべき) か */
export function isDueThisWeekOrOverdue(due: string | null): boolean {
  const inst = dueInstant(due);
  if (inst === null) return false;
  return inst <= endOfThisWeek();
}

// ---- <input type="date"> / <input type="time"> との相互変換 ----

export function splitDue(due: string | null): { date: string; time: string } {
  if (!due) return { date: "", time: "" };
  const [date, time] = due.split("T");
  return { date: date || "", time: time ? time.slice(0, 5) : "" };
}

export function joinDue(date: string, time: string): string | null {
  if (!date) return null;
  return time ? `${date}T${time}` : date;
}

/** createdAt / updatedAt 表示用 */
export function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${mm}`;
}

/** ヘッダー用の今日の日付 "2026年6月15日(日)" */
export function todayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAY[d.getDay()]})`;
}

/** スマホ用のコンパクトな今日 "6/15(日)" */
export function todayShortLabel(): string {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY[d.getDay()]})`;
}
