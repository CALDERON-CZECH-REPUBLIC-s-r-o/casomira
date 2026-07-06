/**
 * České QR platby (SPAYD / „QR Platba"). Bez závislostí — čisté funkce.
 * `ucetNaIban` převede tuzemský účet na IBAN, `spayd` složí řetězec pro QR.
 */

/** Zbytek po dělení 97 pro (potenciálně velké) číslo v řetězci. */
function mod97(cislice: string): number {
  let zbytek = 0;
  for (const ch of cislice) {
    zbytek = (zbytek * 10 + (ch.charCodeAt(0) - 48)) % 97;
  }
  return zbytek;
}

/**
 * Převede český účet `[předčíslí-]číslo/kódbanky` na IBAN (CZ, mod-97).
 * Když vstup už začíná „CZ" (IBAN), vrátí ho normalizovaný (bez mezer).
 * Vrací null u nerozpoznatelného vstupu.
 */
export function ucetNaIban(ucet: string | null | undefined): string | null {
  if (!ucet) return null;
  const s = ucet.trim().replace(/\s+/g, "");
  if (/^CZ\d{22}$/i.test(s)) return s.toUpperCase();

  const m = s.match(/^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/);
  if (!m) return null;
  const predcisli = (m[1] ?? "").padStart(6, "0");
  const cislo = m[2].padStart(10, "0");
  const banka = m[3];
  const bban = banka + predcisli + cislo; // 4 + 6 + 10 = 20 číslic
  // Kontrolní číslice: BBAN + "CZ"(=1235) + "00", pak 98 - (mod 97).
  const kontrola = 98 - mod97(bban + "123500");
  return `CZ${String(kontrola).padStart(2, "0")}${bban}`;
}

/** Odstraní znaky nepovolené v hodnotě SPAYD (`*`) a ořízne délku. */
function ocisti(hodnota: string, max = 60): string {
  return hodnota.replace(/\*/g, " ").trim().slice(0, max);
}

/**
 * Složí SPAYD řetězec pro českou QR platbu.
 * `SPD*1.0*ACC:<IBAN>*AM:<částka>*CC:CZK*X-VS:<VS>*MSG:<zpráva>`
 */
export function spayd(opts: {
  iban: string;
  castka?: number | null;
  vs?: string | null;
  zprava?: string | null;
}): string {
  const casti = ["SPD", "1.0", `ACC:${opts.iban}`];
  if (opts.castka != null && opts.castka > 0) {
    casti.push(`AM:${opts.castka.toFixed(2)}`);
    casti.push("CC:CZK");
  }
  if (opts.vs) casti.push(`X-VS:${opts.vs.replace(/\D/g, "").slice(0, 10)}`);
  if (opts.zprava) casti.push(`MSG:${ocisti(opts.zprava)}`);
  return casti.join("*");
}
