import "server-only";
import { db } from "@/db/client";
import { nactiDataAkce } from "./listiny-data";
import { serazeneVysledky } from "@/domain/vysledky";

/**
 * Vývoj časů vítězů napříč akcemi. Pro každou akci s výsledky (naměřené i
 * naimportované historické) vezme vítěze každé kategorie a poskládá časovou řadu
 * podle kategorie (klíč = kód, jinak název), rozdělenou na muže/ženy/smíšené.
 */

export interface VyvojBod {
  rok: number;
  datum: string;
  casMs: number;
  vitez: string;
  akceNazev: string;
  akceId: string;
  slug: string;
}

export interface KategorieVyvoj {
  klic: string;
  nazev: string;
  pohlavi: "M" | "Z" | "smisene";
  body: VyvojBod[]; // seřazené dle data vzestupně
}

export interface VyvojData {
  muzi: KategorieVyvoj[];
  zeny: KategorieVyvoj[];
  smisene: KategorieVyvoj[];
  pocetAkci: number; // akcí s alespoň jedním vítězem
}

export async function nactiVyvojCasu(): Promise<VyvojData> {
  const akce = await db.query.akce.findMany({
    orderBy: (a, { asc }) => [asc(a.datum)],
    columns: { id: true },
  });
  const vsechnyKat = await db.query.kategorie.findMany({
    columns: { id: true, pohlavi: true },
  });
  const pohlaviMap = new Map(vsechnyKat.map((k) => [k.id, k.pohlavi]));

  const skupiny = new Map<string, KategorieVyvoj>();
  const akceSVysledky = new Set<string>();

  for (const a of akce) {
    const data = await nactiDataAkce(a.id);
    if (!data) continue;
    const vys = serazeneVysledky(
      data.zavodnici,
      data.zaznamy,
      data.akce.casStartu,
      data.kategorie,
    );
    for (const sk of vys.kategorie) {
      if (!sk.kategorie) continue;
      const vitez = sk.radky.find(
        (r) => r.stav === "klasifikovan" && r.cistyCasMs !== null,
      );
      if (!vitez) continue;
      akceSVysledky.add(a.id);

      const klic = sk.kategorie.kod ?? sk.kategorie.nazev;
      const pohlavi = pohlaviMap.get(sk.kategorie.id) ?? "smisene";
      let g = skupiny.get(klic);
      if (!g) {
        g = { klic, nazev: sk.kategorie.nazev, pohlavi, body: [] };
        skupiny.set(klic, g);
      }
      g.body.push({
        rok: data.akce.rok,
        datum: data.akce.datum,
        casMs: vitez.cistyCasMs!,
        vitez: `${vitez.zavodnik.prijmeni} ${vitez.zavodnik.jmeno}`.trim(),
        akceNazev: data.akce.nazev,
        akceId: a.id,
        slug: data.akce.slug,
      });
    }
  }

  const seznam = [...skupiny.values()]
    .map((g) => ({
      ...g,
      body: g.body.sort((x, y) => x.datum.localeCompare(y.datum)),
    }))
    .sort((a, b) => a.klic.localeCompare(b.klic, "cs"));

  return {
    muzi: seznam.filter((g) => g.pohlavi === "M"),
    zeny: seznam.filter((g) => g.pohlavi === "Z"),
    smisene: seznam.filter((g) => g.pohlavi === "smisene"),
    pocetAkci: akceSVysledky.size,
  };
}
