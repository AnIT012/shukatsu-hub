// 自動ローカルバックアップ(復元ポイント)。
// 保存のたびに直近の状態を端末に退避し、万一データが消えても必ず戻せるようにする。
// クラウド同期では一切上書きされない別キーに保持する。

import type { Application, EventItem } from "./types";

export interface Snapshot {
  /** 退避時刻(ISO) */
  at: string;
  /** 選考件数(一覧表示用) */
  apps: number;
  /** イベント件数(一覧表示用) */
  events: number;
  /** 復元用の生データ(JSON文字列: {applications, events}) */
  data: string;
}

const MAX = 15;
const keyFor = (cacheKey: string) => `${cacheKey}:snapshots`;

/** 現在の状態を復元ポイントとして退避(直近と同一/空ならスキップ)。最大15世代。 */
export function pushSnapshot(
  cacheKey: string,
  applications: Application[],
  events: EventItem[],
) {
  try {
    // 空(全消し直後など)は誤って復元させないため保存しない
    if (applications.length === 0 && events.length === 0) return;
    const payload = JSON.stringify({ applications, events });
    const list = listSnapshots(cacheKey);
    // 直近と「中身が同じ」ならスキップ。updatedAt は内容が変わらなくても毎回変わるので
    // 比較からは除外する(でないと実質的に毎回新規スナップショットになり15枠がすぐ埋まる)。
    const omitUpdated = (k: string, v: unknown) =>
      k === "updatedAt" ? undefined : v;
    const sig = JSON.stringify({ applications, events }, omitUpdated);
    const prevSig = list[0]
      ? JSON.stringify(JSON.parse(list[0].data), omitUpdated)
      : null;
    if (sig === prevSig) return; // 直近と同一ならスキップ
    const snap: Snapshot = {
      at: new Date().toISOString(),
      apps: applications.length,
      events: events.length,
      data: payload,
    };
    const next = [snap, ...list].slice(0, MAX);
    localStorage.setItem(keyFor(cacheKey), JSON.stringify(next));
  } catch {
    // 容量超過等は無視(本筋の保存には影響させない)
  }
}

/** 退避済みの復元ポイント一覧(新しい順) */
export function listSnapshots(cacheKey: string): Snapshot[] {
  try {
    const raw = localStorage.getItem(keyFor(cacheKey));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
