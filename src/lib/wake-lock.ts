"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// Podpora Wake Locku je statická vlastnost prohlížeče — čteme ji přes
// useSyncExternalStore (serverový snapshot `false`), takže nevzniká hydration
// mismatch ani setState v effectu. Prázdný subscribe = hodnota se nemění.
const prazdnySubscribe = () => () => {};
const jeWakeLockPodporovan = () => "wakeLock" in navigator;
const naServeru = () => false;

/**
 * Drží obrazovku vzhůru po dobu měření (Wake Lock API). Po přepnutí tabu se
 * zámek uvolní → re-akvizice na `visibilitychange`. Vrací, zda je zámek aktivní
 * a zda ho prohlížeč podporuje (viz SPEC 7.4).
 */
export function useWakeLock(aktivni: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const [drzi, setDrzi] = useState(false);
  const podporovano = useSyncExternalStore(
    prazdnySubscribe,
    jeWakeLockPodporovan,
    naServeru,
  );

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
    // Imperativní akvizice zámku; `ziskat` je async a `setDrzi` volá až po awaitu
    // (ne synchronně) → žádné kaskádové renderování.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
