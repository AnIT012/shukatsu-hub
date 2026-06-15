import type {
  Application,
  BackupFile,
  Priority,
  RelatedLink,
  ResultStatus,
  SelectionStep,
  StepKind,
  StepStatus,
} from "./types";
import { newId } from "./utils";

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const RESULTS: ResultStatus[] = ["in_progress", "passed", "rejected", "declined"];
const STEP_KINDS: StepKind[] = [
  "entry",
  "es",
  "web_test",
  "video",
  "gd",
  "interview",
  "final_interview",
  "internship",
  "other",
];
const STEP_STATUSES: StepStatus[] = ["not_started", "in_progress", "done"];

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as T)
    : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function sanitizeStep(raw: any): SelectionStep {
  return {
    id: str(raw?.id) || newId(),
    kind: pick<StepKind>(raw?.kind, STEP_KINDS, "other"),
    name: str(raw?.name),
    dueAt:
      typeof raw?.dueAt === "string" && raw.dueAt.length > 0 ? raw.dueAt : null,
    status: pick<StepStatus>(raw?.status, STEP_STATUSES, "not_started"),
    memo: str(raw?.memo),
  };
}

function sanitizeLink(raw: any): RelatedLink {
  return {
    id: str(raw?.id) || newId(),
    label: str(raw?.label),
    url: str(raw?.url),
  };
}

function sanitizeApp(raw: any): Application {
  const ts = new Date().toISOString();
  return {
    id: str(raw?.id) || newId(),
    company: str(raw?.company),
    role: str(raw?.role),
    priority: pick<Priority>(raw?.priority, PRIORITIES, "medium"),
    result: pick<ResultStatus>(raw?.result, RESULTS, "in_progress"),
    links: Array.isArray(raw?.links) ? raw.links.map(sanitizeLink) : [],
    memo: str(raw?.memo),
    steps: Array.isArray(raw?.steps) ? raw.steps.map(sanitizeStep) : [],
    createdAt: str(raw?.createdAt) || ts,
    updatedAt: str(raw?.updatedAt) || ts,
  };
}

/** インポート JSON を Application[] に正規化(不正なら例外) */
export function parseBackup(text: string): Application[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("JSON として読み取れませんでした");
  }
  const apps = Array.isArray(data) ? data : (data as any)?.applications;
  if (!Array.isArray(apps)) {
    throw new Error("applications 配列が見つかりませんでした");
  }
  return apps.map(sanitizeApp);
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsText(file);
  });
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** 現在のデータを JSON ファイルとしてダウンロード */
export function exportApplications(applications: Application[]) {
  const backup: BackupFile = {
    version: 1,
    savedAt: new Date().toISOString(),
    applications,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `shukatsu-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
