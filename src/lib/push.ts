// Web Push のクライアント側ヘルパー(SW登録・許可・購読)。
// 秘密鍵は持たない。購読JSONを得て store(→Supabase) に保存するだけ。

import { VAPID_PUBLIC_KEY } from "./constants";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** この端末/ブラウザが Web Push に対応しているか */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** ホーム画面に追加(standalone)されているか。iOSは standalone でないと Push 不可 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    // iOS Safari 独自
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** iOS(iPhone/iPad)判定。ホーム追加の案内出し分け用 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/** 許可を求めて購読。成功すれば購読JSONを返す(失敗/拒否は null) */
export async function enablePush(): Promise<PushSubscriptionJSON | null> {
  if (!pushSupported()) return null;
  const reg = await getRegistration();
  if (!reg) return null;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return null;
  try {
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          VAPID_PUBLIC_KEY,
        ) as BufferSource,
      }));
    return sub.toJSON();
  } catch {
    return null;
  }
}

export type TestNotifyResult = "ok" | "unsupported" | "denied" | "nosw";

/**
 * この端末で即座にテスト通知を表示する(サーバー/cron を介さない)。
 * 通知の「許可 → Service Worker → 表示」経路が生きているかを一発で確認する用。
 */
export async function showTestNotification(): Promise<TestNotifyResult> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";
  }
  const reg = await getRegistration();
  if (!reg) return "nosw";
  await reg.showNotification("就活Hub｜テスト通知", {
    body: "この端末で通知が正しく表示されています ✅",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "shukatsu-test",
    data: { url: "/" },
  } as NotificationOptions);
  return "ok";
}

/** この端末の購読を解除 */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {
    // ignore
  }
}
