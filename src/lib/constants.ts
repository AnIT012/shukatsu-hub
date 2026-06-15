import {
  Send,
  FileText,
  ClipboardList,
  Video,
  Users,
  MessagesSquare,
  Crown,
  Briefcase,
  Circle,
  type LucideIcon,
} from "lucide-react";
import type { Priority, ResultStatus, StepKind, StepStatus } from "./types";

// ---------------- 選択肢(セレクト用) ----------------

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

export const RESULT_OPTIONS: { value: ResultStatus; label: string }[] = [
  { value: "in_progress", label: "進行中" },
  { value: "passed", label: "通過・合格" },
  { value: "rejected", label: "不合格" },
  { value: "declined", label: "辞退" },
];

export const STEP_KIND_OPTIONS: { value: StepKind; label: string }[] = [
  { value: "entry", label: "エントリー" },
  { value: "es", label: "ES提出" },
  { value: "web_test", label: "Webテスト・適性検査" },
  { value: "video", label: "録画動画" },
  { value: "gd", label: "グループディスカッション(GD)" },
  { value: "interview", label: "面接" },
  { value: "final_interview", label: "最終面接" },
  { value: "internship", label: "インターン参加" },
  { value: "other", label: "その他" },
];

export const STEP_STATUS_OPTIONS: { value: StepStatus; label: string }[] = [
  { value: "not_started", label: "未着手" },
  { value: "in_progress", label: "進行中" },
  { value: "done", label: "完了" },
];

// ---------------- ラベル逆引き ----------------

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const RESULT_LABEL: Record<ResultStatus, string> = {
  in_progress: "進行中",
  passed: "合格",
  rejected: "不合格",
  declined: "辞退",
};

export const STEP_KIND_LABEL: Record<StepKind, string> = STEP_KIND_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<StepKind, string>,
);

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  done: "完了",
};

// ---------------- アイコン ----------------

export const STEP_KIND_ICON: Record<StepKind, LucideIcon> = {
  entry: Send,
  es: FileText,
  web_test: ClipboardList,
  video: Video,
  gd: Users,
  interview: MessagesSquare,
  final_interview: Crown,
  internship: Briefcase,
  other: Circle,
};

// ---------------- 配色(Tailwind クラス) ----------------

/** 優先度バッジ */
export const PRIORITY_BADGE: Record<Priority, string> = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300 border border-slate-200 dark:border-slate-500/20",
};

/** 結果ステータスバッジ */
export const RESULT_BADGE: Record<ResultStatus, string> = {
  in_progress:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20",
  passed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20",
  rejected:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20",
  declined:
    "bg-zinc-100 text-zinc-500 dark:bg-zinc-500/15 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-500/20",
};

/** ステップ状態のドット色 */
export const STEP_STATUS_DOT: Record<StepStatus, string> = {
  not_started: "border-2 border-muted-foreground/40 bg-transparent",
  in_progress: "border-2 border-amber-500 bg-amber-500/20",
  done: "border-2 border-emerald-500 bg-emerald-500 text-white",
};

export const LS_KEY = "shukatsu-dashboard:v1";
