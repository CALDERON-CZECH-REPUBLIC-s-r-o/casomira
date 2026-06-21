import { DateTime, Duration } from "luxon";

/**
 * Formátování času pro měření. Wall-clock razítka (ms) z notebooku operátora.
 * Vše ukládáme v UTC, zobrazujeme v lokální zóně.
 */

/** Čas dne s milisekundami: "14:03:27.480". */
export function casDne(d: Date | string): string {
  const dt = typeof d === "string" ? DateTime.fromISO(d) : DateTime.fromJSDate(d);
  return dt.toFormat("HH:mm:ss.SSS");
}

/** Čas dne bez ms: "14:03:27". */
export function casDneKratky(d: Date | string): string {
  const dt = typeof d === "string" ? DateTime.fromISO(d) : DateTime.fromJSDate(d);
  return dt.toFormat("HH:mm:ss");
}

/**
 * Uplynulý čas (čistý čas) z milisekund. Pod hodinu "mm:ss.S", nad hodinu "h:mm:ss.S".
 * Desetiny — používá měřicí obrazovka pro průběžný náhled.
 */
export function uplynulyCas(ms: number): string {
  if (ms < 0) ms = 0;
  const d = Duration.fromMillis(ms);
  const desetiny = Math.floor((ms % 1000) / 100);
  if (ms >= 3600_000) {
    return d.toFormat("h:mm:ss") + "." + desetiny;
  }
  return d.toFormat("mm:ss") + "." + desetiny;
}

/**
 * Čistý čas do výsledkové listiny — setiny: "mm:ss.SS" (pod hodinu) / "h:mm:ss.SS".
 */
export function cistyCas(ms: number): string {
  if (ms < 0) ms = 0;
  const d = Duration.fromMillis(ms);
  const setiny = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");
  if (ms >= 3600_000) {
    return d.toFormat("h:mm:ss") + "." + setiny;
  }
  return d.toFormat("mm:ss") + "." + setiny;
}

/** Ztráta na vítěze: "+mm:ss.SS", pro vítěze (0 nebo null) "—". */
export function ztrata(ms: number | null): string {
  if (ms === null || ms <= 0) return "—";
  return "+" + cistyCas(ms);
}
