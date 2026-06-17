import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * ユーザー入力URLを安全な href に。http(s) と相対パスのみ許可し、
 * javascript:/data: などのスキームは無効化(自己XSS対策)。
 */
export function safeHref(url: string | null | undefined): string {
  const u = (url ?? "").trim();
  if (!u) return "#";
  if (/^https?:\/\//i.test(u)) return u;
  if (/^\/(?!\/)/.test(u)) return u; // 先頭スラッシュの相対(// は除外)
  // スキーム付き(javascript: data: 等)は拒否、それ以外は https を補って外部リンク扱い
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return "#";
  return `https://${u}`;
}

/** 安定したユニークID。crypto.randomUUID が無い環境にもフォールバック。 */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
