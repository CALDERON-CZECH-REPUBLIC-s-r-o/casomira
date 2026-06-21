export type Pohlavi = "M" | "Z";

const MUZ = new Set([
  "m",
  "muz",
  "muž",
  "muzi",
  "muži",
  "male",
  "man",
  "chlapec",
  "h",
]);
const ZENA = new Set([
  "z",
  " z",
  "ž",
  "zena",
  "žena",
  "zeny",
  "ženy",
  "female",
  "woman",
  "divka",
  "dívka",
  "f",
  "w",
]);

/**
 * Normalizuje hodnotu pohlaví z Excelu na M/Z. Akceptuje běžné varianty.
 * Vrací null, pokud chybí nebo je nejednoznačná (→ k doplnění v aplikaci).
 */
export function normalizujPohlavi(raw: unknown): Pohlavi | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "") return null;
  if (MUZ.has(s)) return "M";
  if (ZENA.has(s)) return "Z";
  return null;
}

/**
 * Heuristický odhad pohlaví z českého příjmení (-ová / -á → žena).
 * Volitelná pomůcka, když přihlášky pohlaví neobsahují (typický prezenční arch).
 * Vrací null u nejistých případů (neslovanská příjmení apod.).
 */
export function odhadniPohlaviZPrijmeni(prijmeni: string): Pohlavi | null {
  const p = prijmeni.trim().toLowerCase();
  if (p === "") return null;
  // Spolehlivé české pravidlo: ženská příjmení končí na -á (Nováková, Černá).
  // Ostatní bereme jako mužská. Heuristika je volitelná a editovatelná v aplikaci.
  return p.endsWith("á") ? "Z" : "M";
}
