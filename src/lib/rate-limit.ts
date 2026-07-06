import "server-only";
import { headers } from "next/headers";

/**
 * Jednoduchý in-memory rate-limiter (sliding window). Autoritativní server je
 * single-instance → paměť stačí; reset při redeployi je přijatelný. Není to
 * ochrana proti DDoS, jen brzda proti spamu formulářů.
 */
const okna = new Map<string, number[]>();

/** Klientská IP z proxy hlaviček (Traefik/Coolify). */
export async function klientskaIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "neznama";
}

/**
 * Vrátí true, když je akce pro daný klíč povolená (a započítá ji). false =
 * překročen limit `max` požadavků za `oknoMs`.
 */
export function pod_limitem(klic: string, max: number, oknoMs: number): boolean {
  const ted = Date.now();
  const hranice = ted - oknoMs;
  const casy = (okna.get(klic) ?? []).filter((t) => t > hranice);
  if (casy.length >= max) {
    okna.set(klic, casy);
    return false;
  }
  casy.push(ted);
  okna.set(klic, casy);
  // Občasný úklid starých klíčů, ať mapa neroste donekonečna.
  if (okna.size > 5000) {
    for (const [k, v] of okna) {
      if (v.every((t) => t <= hranice)) okna.delete(k);
    }
  }
  return true;
}
