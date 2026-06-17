"use client";

import { useEffect } from "react";

/**
 * アプリ起動時に Service Worker を登録する。
 * これによりアプリシェルがキャッシュされ、圏外でも起動・閲覧でき、
 * 低速回線(ギガ切れ等)でも2回目以降の起動が速くなる。
 */
export function SwRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 登録失敗は致命的ではない(オンライン時は通常どおり動く)
    });
  }, []);
  return null;
}
