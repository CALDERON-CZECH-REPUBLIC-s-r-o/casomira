import { DateTime, Duration } from "luxon";

/**
 * Formátování času pro měření. Wall-clock razítka (ms) z notebooku operátora.
 * Vše ukládáme v UTC, zobrazujeme v PEVNÉ zóně (Europe/Prague) — jinak by se čas
 * lišil mezi serverem (UTC) a prohlížečem (lokální) o offset zóny.
 */
const ZONA = "Europe/Prague";

/** Luxon DateTime v pevné zóně akce z Date nebo ISO stringu. */
function vZone(d: Date | string): DateTime {
  return typeof d === "string"
    ? DateTime.fromISO(d, { zone: ZONA })
    : DateTime.fromJSDate(d, { zone: ZONA });
}

/** Čas dne s milisekundami: "14:03:27.480". */
export function casDne(d: Date | string): string {
  return vZone(d).toFormat("HH:mm:ss.SSS");
}

/** Čas dne bez ms: "14:03:27". */
export function casDneKratky(d: Date | string): string {
  return vZone(d).toFormat("HH:mm:ss");
}

/** Datum a čas bez sekund: "5. 7. 2026 14:03" (zóna akce). */
export function datumCasKratky(d: Date | string): string {
  return vZone(d).toFormat("d. M. yyyy HH:mm");
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

/**
 * Parsuje čistý (uplynulý) čas na milisekundy. Přijímá `mm:ss(.f)`,
 * `h:mm:ss(.f)` i `m:ss`; frakce 1–3 číslice (`.` nebo `,`). null = neplatný.
 * Např. "17:42.30" → 1062300, "1:05:22.15" → 3922150, "5:30" → 330000.
 */
export function cistyCasNaMs(str: string): number | null {
  const s = str.trim();
  const m = s.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const [, hh, mm, ss, frac] = m;
  const hodiny = hh ? Number(hh) : 0;
  const minuty = Number(mm);
  const sekundy = Number(ss);
  if (minuty > 59 || sekundy > 59) return null;
  const ms = frac ? Number((frac + "000").slice(0, 3)) : 0;
  return ((hodiny * 60 + minuty) * 60 + sekundy) * 1000 + ms;
}

/** Čas dne pro editační input: "HH:mm:ss.SSS" (zóna akce). */
export function casNaInput(d: Date | string): string {
  return vZone(d).toFormat("HH:mm:ss.SSS");
}

/**
 * Sestaví nové razítko z editovaného času dne ("HH:mm:ss(.SSS)"), zachová datum
 * původního razítka (zóna Europe/Prague). null = neplatný formát.
 */
export function inputNaCas(
  original: Date | string,
  hhmmss: string,
): Date | null {
  const m = hhmmss.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const [, h, min, s, frac] = m;
  const ms = frac ? Number((frac + "000").slice(0, 3)) : 0;
  if (Number(h) > 23 || Number(min) > 59 || Number(s) > 59) return null;
  const base = vZone(original);
  const novy = base.set({
    hour: Number(h),
    minute: Number(min),
    second: Number(s),
    millisecond: ms,
  });
  return novy.isValid ? novy.toJSDate() : null;
}
