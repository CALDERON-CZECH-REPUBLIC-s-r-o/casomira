/**
 * Generátor věkových kategorií pro průvodce. Z pár parametrů (pohlaví, šířka
 * pásma, rozsah věku) vyrobí sadu kategorií — typicky M/Ž po dekádách. Ročníkové
 * dělení řeš ručním formulářem. Čistá funkce (testovatelná mimo UI).
 */

export type PohlaviRezim = "oddelene" | "muzi" | "zeny" | "smisene";

export interface GenParams {
  rezim: PohlaviRezim;
  sirka: number; // šířka pásma v letech
  od: number; // nejnižší věk
  doVek: number; // nejvyšší věk
  posledniOtevrena: boolean; // nejstarší pásmo bez horní hranice („60+ let")
}

export interface GenKategorie {
  nazev: string;
  kod: string;
  pohlavi: "M" | "Z" | "smisene";
  vekOd: number | null;
  vekDo: number | null;
  rokNarozeniOd: number | null;
  rokNarozeniDo: number | null;
  poradi: number;
}

export function generujKategorie(p: GenParams): GenKategorie[] {
  const sirka = Math.max(1, Math.floor(p.sirka || 1));
  const od = Math.max(0, Math.floor(p.od));
  const doVek = Math.max(od, Math.floor(p.doVek));

  const genders: ("M" | "Z" | "smisene")[] =
    p.rezim === "oddelene"
      ? ["M", "Z"]
      : p.rezim === "muzi"
        ? ["M"]
        : p.rezim === "zeny"
          ? ["Z"]
          : ["smisene"];

  const pasma: { a: number; b: number; posledni: boolean }[] = [];
  for (let a = od; a <= doVek; a += sirka) {
    pasma.push({
      a,
      b: Math.min(a + sirka - 1, doVek),
      posledni: a + sirka > doVek,
    });
  }

  const out: GenKategorie[] = [];
  let poradi = 1;
  for (const g of genders) {
    const prefix = g === "M" ? "Muži " : g === "Z" ? "Ženy " : "";
    const letter = g === "M" ? "M" : g === "Z" ? "Z" : "";
    for (const bd of pasma) {
      const openTop = p.posledniOtevrena && bd.posledni;
      const rozsah = openTop ? `${bd.a}+ let` : `${bd.a}–${bd.b} let`;
      out.push({
        nazev: (prefix + rozsah).trim(),
        kod: `${letter}${bd.a}`,
        pohlavi: g,
        vekOd: bd.a,
        vekDo: openTop ? null : bd.b,
        rokNarozeniOd: null,
        rokNarozeniDo: null,
        poradi: poradi++,
      });
    }
  }
  return out;
}
