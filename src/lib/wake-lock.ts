"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drží obrazovku vzhůru po dobu měření (Wake Lock API). Po přepnutí tabu se
 * zámek uvolní → re-akvizice na `visibilitychange`. Vrací, zda je zámek aktivní
 * a zda ho prohlížeč podporuje (viz SPEC 7.4).
 */
export function useWakeLock(aktivni: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const [drzi, setDrzi] = useState(false);
  const podporovano =
    typeof navigator !== "undefined" && "wakeLock" in navigator;

  const ziskat = useCallback(async () => {
    if (!podporovano || !aktivni) return;
    try {
      const s = await navigator.wakeLock.request("screen");
      sentinelRef.current = s;
      setDrzi(true);
      s.addEventListener("release", () => setDrzi(false));
    } catch {
      setDrzi(false);
    }
  }, [podporovano, aktivni]);

  useEffect(() => {
    if (!aktivni) return;
    ziskat();

    const naViditelnost = () => {
      if (document.visibilityState === "visible") ziskat();
    };
    document.addEventListener("visibilitychange", naViditelnost);

    return () => {
      document.removeEventListener("visibilitychange", naViditelnost);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
      setDrzi(false);
    };
  }, [aktivni, ziskat]);

  return { drzi, podporovano };
}
