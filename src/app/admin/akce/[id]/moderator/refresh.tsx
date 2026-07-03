"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Tichý obnovovač: každých 5 s zavolá router.refresh(), aby se server komponenta
 * moderátorské obrazovky přepočítala z čerstvých dat. Nic nevykresluje.
 */
export function Refresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
