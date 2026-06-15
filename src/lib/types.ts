// ============================================================
// 就活ダッシュボード ドメイン型
// ============================================================

/** 選考ステップの種別 */
export type StepKind =
  | "entry" // エントリー
  | "es" // ES提出
  | "web_test" // Webテスト・適性検査
  | "video" // 録画動画
  | "gd" // グループディスカッション(GD)
  | "interview" // 面接
  | "final_interview" // 最終面接
  | "internship" // インターン参加
  | "other"; // その他

/** ステップの進捗状態 */
export type StepStatus = "not_started" | "in_progress" | "done"; // 未着手 / 進行中 / 完了

/** 企業ごとの優先度 */
export type Priority = "high" | "medium" | "low"; // 高 / 中 / 低

/** 選考の最終的な結果ステータス("今どの段階か"はステップで管理し、ここは結果だけ) */
export type ResultStatus =
  | "in_progress" // 進行中
  | "passed" // 通過・合格
  | "rejected" // 不合格
  | "declined"; // 辞退

/** 関連リンク(ラベル付きURL) */
export interface RelatedLink {
  id: string;
  label: string;
  url: string;
}

/** 選考ステップ(中核。1社が複数持つ) */
export interface SelectionStep {
  id: string;
  kind: StepKind;
  /** 自由記述の補足。例:「一次面接(オンライン)」 */
  name: string;
  /** 締切 or 実施日。"YYYY-MM-DD" もしくは "YYYY-MM-DDTHH:mm"。未設定は null */
  dueAt: string | null;
  status: StepStatus;
  /** そのステップ個別のメモ */
  memo: string;
}

/** 1社の応募 */
export interface Application {
  id: string;
  company: string;
  role: string;
  priority: Priority;
  result: ResultStatus;
  links: RelatedLink[];
  /** 全体メモ(長文OK・改行保持) */
  memo: string;
  steps: SelectionStep[];
  createdAt: string;
  updatedAt: string;
}

/** localStorage 保存形式 兼 エクスポート/インポート形式 */
export interface BackupFile {
  version: number;
  savedAt: string;
  applications: Application[];
}

// ------- UI 用の補助型 -------

export type SortKey = "deadline" | "priority" | "name";

export interface Filters {
  result: ResultStatus | "all";
  priority: Priority | "all";
  onlyThisWeek: boolean;
  query: string;
}
