/**
 * Pravidla zařazení závodníka do kategorie.
 *
 * Kategorie lze omezit pohlavím a buď VĚKEM (proti referenčnímu roku akce),
 * nebo ROČNÍKEM narození. Vyhrává první vyhovující kategorie podle `poradi`
 * (deterministické řešení překryvů — viz SPEC 5.3).
 */

export type PohlaviZavodnika = "M" | "Z";
export type PohlaviKategorie = "M" | "Z" | "smisene";

export interface ZavodnikProZarazeni {
  pohlavi: PohlaviZavodnika | null;
  rokNarozeni: number | null;
}

export interface KategorieProZarazeni {
  id: string;
  poradi: number;
  pohlavi: PohlaviKategorie;
  rokNarozeniOd: number | null;
  rokNarozeniDo: number | null;
  vekOd: number | null;
  vekDo: number | null;
}

/** Věk dosažený v referenčním roce akce. */
export function vekVRoce(akceRok: number, rokNarozeni: number): number {
  return akceRok - rokNarozeni;
}

function pohlaviSedi(
  kat: PohlaviKategorie,
  z: PohlaviZavodnika,
): boolean {
  return kat === "smisene" || kat === z;
}

function vRozsahu(
  hodnota: number,
  od: number | null,
  do_: number | null,
): boolean {
  if (od !== null && hodnota < od) return false;
  if (do_ !== null && hodnota > do_) return false;
  return true;
}

/**
 * Vyhovuje závodník dané kategorii? Potřebuje pohlaví; věk/ročník jen pokud
 * kategorie takové omezení má (jinak nezáleží).
 */
export function kategorieVyhovuje(
  z: ZavodnikProZarazeni,
  kat: KategorieProZarazeni,
  akceRok: number,
): boolean {
  if (z.pohlavi === null) return false;
  if (!pohlaviSedi(kat.pohlavi, z.pohlavi)) return false;

  const maVek = kat.vekOd !== null || kat.vekDo !== null;
  const maRocnik = kat.rokNarozeniOd !== null || kat.rokNarozeniDo !== null;

  if (maVek) {
    if (z.rokNarozeni === null) return false;
    const vek = vekVRoce(akceRok, z.rokNarozeni);
    if (!vRozsahu(vek, kat.vekOd, kat.vekDo)) return false;
  } else if (maRocnik) {
    if (z.rokNarozeni === null) return false;
    if (!vRozsahu(z.rokNarozeni, kat.rokNarozeniOd, kat.rokNarozeniDo))
      return false;
  }

  return true;
}

/**
 * Vrátí id první vyhovující kategorie (dle `poradi`), nebo null (k řešení).
 */
export function zaradit(
  z: ZavodnikProZarazeni,
  kategorie: KategorieProZarazeni[],
  akceRok: number,
): string | null {
  const serazene = [...kategorie].sort((a, b) => a.poradi - b.poradi);
  for (const kat of serazene) {
    if (kategorieVyhovuje(z, kat, akceRok)) return kat.id;
  }
  return null;
}
