// 毎日の自動バックアップ(端末の中・30日分)。
// 復元ポイント(snapshots.ts・直近15回)は保存のたびに流れていくので、
// 「先週の状態に戻したい」「パスワードを忘れて暗号化した分が開けない」に備えて、1日1つを30日残す。
//
// localStorage ではなく IndexedDB に置く。30日分の全データを localStorage に積むと、
// 5MB の上限に当たって本体のキャッシュ保存まで失敗しうるため(本体を巻き込まない置き場)。
// その日の最後の状態で上書きする(1日1つ)。空のデータは残さない。

import type { Application, EventItem } from "./types";

export interface DailyBackup {
  /** 端末の日付 "YYYY-MM-DD" */
  day: string;
  /** 最後に書いた時刻(ISO) */
  at: string;
  apps: number;
  events: number;
  /** 復元用の生データ(JSON文字列: {applications, events}) */
  data: string;
}

const DB = "shukatsu-dashboard-backup";
const STORE = "daily";
const KEEP_DAYS = 30;

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

const keyOf = (cacheKey: string, day: string) => `${cacheKey}|${day}`;

/** 今日の分を書く(同じ日は上書き)。30日より古い分は捨てる。失敗しても本筋には影響させない */
export async function saveDailyBackup(
  cacheKey: string,
  applications: Application[],
  events: EventItem[],
): Promise<void> {
  if (applications.length === 0 && events.length === 0) return;
  const db = await open();
  if (!db) return;
  try {
    const day = localDay();
    const rec: DailyBackup = {
      day,
      at: new Date().toISOString(),
      apps: applications.length,
      events: events.length,
      data: JSON.stringify({ applications, events }),
    };
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const st = tx.objectStore(STORE);
      st.put(rec, keyOf(cacheKey, day));
      // この利用者の分だけ、新しい順に30日を超えた物を消す
      const range = IDBKeyRange.bound(`${cacheKey}|`, `${cacheKey}|￿`);
      const keysReq = st.getAllKeys(range);
      keysReq.onsuccess = () => {
        const keys = (keysReq.result as string[]).slice().sort().reverse();
        for (const k of keys.slice(KEEP_DAYS)) st.delete(k);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    // ignore
  } finally {
    db.close();
  }
}

/** この利用者の毎日のバックアップ(新しい順) */
export async function listDailyBackups(cacheKey: string): Promise<DailyBackup[]> {
  const db = await open();
  if (!db) return [];
  try {
    return await new Promise<DailyBackup[]>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const range = IDBKeyRange.bound(`${cacheKey}|`, `${cacheKey}|￿`);
      const req = tx.objectStore(STORE).getAll(range);
      req.onsuccess = () => {
        const arr = (req.result as DailyBackup[]).filter((r) => r && typeof r.data === "string");
        resolve(arr.sort((a, b) => (a.day < b.day ? 1 : -1)));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  } finally {
    db.close();
  }
}
