import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  akce as akceT,
  kategorie as katT,
  zavodnik as zavT,
  cilovyZaznam,
} from "@/db/schema";
import type {
  ZavodnikVysledek,
  KategorieVysledek,
  ZaznamVysledek,
} from "@/domain/vysledky";

export interface DataAkce {
  akce: {
    id: string;
    nazev: string;
    datum: string;
    misto: string | null;
    rok: number;
    slug: string;
    casStartu: Date | null;
  };
  zavodnici: ZavodnikVysledek[];
  kategorie: KategorieVysledek[];
  zaznamy: ZaznamVysledek[];
}

/**
 * Načte a namapuje vše potřebné pro listiny (sdílí HTML tisk, PDF i XLSX).
 * Vrací null, pokud akce neexistuje.
 */
export async function nactiDataAkce(akceId: string): Promise<DataAkce | null> {
  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, akceId) });
  if (!akce) return null;

  const [zavodnici, kategorie, zaznamy] = await Promise.all([
    db.query.zavodnik.findMany({ where: eq(zavT.akceId, akceId) }),
    db.query.kategorie.findMany({ where: eq(katT.akceId, akceId) }),
    db.query.cilovyZaznam.findMany({
      where: eq(cilovyZaznam.akceId, akceId),
      columns: { zavodnikId: true, casCile: true, stav: true },
    }),
  ]);

  return {
    akce: {
      id: akce.id,
      nazev: akce.nazev,
      datum: akce.datum,
      misto: akce.misto,
      rok: akce.rok,
      slug: akce.slug,
      casStartu: akce.casStartu,
    },
    zavodnici: zavodnici.map((z) => ({
      id: z.id,
      jmeno: z.jmeno,
      prijmeni: z.prijmeni,
      rokNarozeni: z.rokNarozeni,
      startovniCislo: z.startovniCislo,
      oddil: z.oddil,
      mesto: z.mesto,
      kategorieId: z.kategorieId,
      stav: z.stav,
      cistyCasImportMs: z.cistyCasImportMs,
    })),
    kategorie: kategorie.map((k) => ({
      id: k.id,
      nazev: k.nazev,
      kod: k.kod,
      poradi: k.poradi,
      casStartu: k.casStartu,
    })),
    zaznamy: zaznamy.map((r) => ({
      zavodnikId: r.zavodnikId,
      casCile: r.casCile,
      stav: r.stav,
    })),
  };
}
