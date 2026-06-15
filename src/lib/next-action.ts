import type { Application, SelectionStep } from "./types";
import { dueInstant, isDueThisWeekOrOverdue } from "./date";

const NO_DUE_KEY = Number.MAX_SAFE_INTEGER; // 締切なしの未完了ステップ
const TERMINAL_KEY = Number.POSITIVE_INFINITY; // 結果待ち / 決着済み / ステップ無し

export type NextActionType = "step" | "waiting" | "empty" | "result";

export interface NextAction {
  type: NextActionType;
  /** type === "step" のときの対象ステップ */
  step: SelectionStep | null;
  /** 一覧ソート用キー(昇順で締切が近い順) */
  sortKey: number;
}

/** 未完了(未着手 or 進行中)のステップ一覧 */
export function incompleteSteps(app: Application): SelectionStep[] {
  return app.steps.filter((s) => s.status !== "done");
}

/**
 * 未完了の中から「最も締切が近い」ステップを返す。
 * 締切ありを優先(昇順)、無ければ並び順で最初の未完了ステップ。
 */
export function getNextActionStep(app: Application): SelectionStep | null {
  const incomplete = incompleteSteps(app);
  if (incomplete.length === 0) return null;

  const withDue = incomplete
    .filter((s) => s.dueAt)
    .sort((a, b) => (dueInstant(a.dueAt) ?? 0) - (dueInstant(b.dueAt) ?? 0));

  if (withDue.length > 0) return withDue[0];
  return incomplete[0];
}

/**
 * 一覧で主役になる「次のアクション」。
 * - 結果が出ている(合格/不合格/辞退) → "result"
 * - 進行中 & 未完了ステップあり → "step"
 * - 進行中 & 全ステップ完了 → "waiting"(結果待ち)
 * - 進行中 & ステップ未登録 → "empty"
 */
export function getNextAction(app: Application): NextAction {
  if (app.result !== "in_progress") {
    return { type: "result", step: null, sortKey: TERMINAL_KEY };
  }
  if (app.steps.length === 0) {
    return { type: "empty", step: null, sortKey: TERMINAL_KEY };
  }
  const step = getNextActionStep(app);
  if (!step) {
    return { type: "waiting", step: null, sortKey: TERMINAL_KEY };
  }
  const sortKey = step.dueAt ? (dueInstant(step.dueAt) ?? NO_DUE_KEY) : NO_DUE_KEY;
  return { type: "step", step, sortKey };
}

/** その企業が抱える「今週やるべき(今週締切 or 期限切れ)未完了ステップ」数 */
export function thisWeekTaskCount(app: Application): number {
  if (app.result !== "in_progress") return 0;
  return app.steps.filter(
    (s) => s.status !== "done" && s.dueAt && isDueThisWeekOrOverdue(s.dueAt),
  ).length;
}

export function hasThisWeekTask(app: Application): boolean {
  return thisWeekTaskCount(app) > 0;
}
