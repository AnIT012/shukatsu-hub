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
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    return sub.toJSON();
  } catch {
    return null;
  }
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
