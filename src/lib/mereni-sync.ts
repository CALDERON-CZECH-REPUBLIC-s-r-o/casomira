"use client";

/**
 * Singleton spouštěč background sync workeru měření. Worker se vytvoří jednou
 * a drží se v modulové proměnné → přežívá client-side navigaci (odskok do menu
 * a zpět). Záměrně se NETERMINUJE při odmountování měřicí obrazovky, aby sync
 * běžel dál na pozadí. Vrací workera pro připojení posluchače (volitelné).
 */
let worker: Worker | null = null;

export function spustSyncWorker(akceId: string): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  if (!worker) {
    try {
      worker = new Worker(
        new URL("./mereni-sync.worker.ts", import.meta.url),
      );
    } catch {
      return null; // prostředí bez modulových workerů → jede jen sync z obrazovky
    }
  }
  worker.postMessage({ type: "watch", akceId });
  return worker;
}
