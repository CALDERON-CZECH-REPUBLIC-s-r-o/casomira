import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { historickyVysledek as histT } from "@/db/schema";

/** Jeden historický výsledek závodníka (pro detail / párování). */
export interface HistorieZavodnika {
  rok: number;
  akceNazev: string;
  kategorie: string | null;
  poradi: number | null;
  casMs: number;
}

/**
 * Historické výsledky konkrétní osoby — shoda přes příjmení + jméno (bez ohledu
 * na velikost písmen) a rok narození (je-li znám). Řazeno od nejnovějšího ročníku.
 */
export async function nactiHistoriiZavodnika(osoba: {
  prijmeni: string;
  jmeno: string;
  rokNarozeni: number | null;
}): Promise<HistorieZavodnika[]> {
  const prijmeni = osoba.prijmeni.trim().toLowerCase();
  const jmeno = osoba.jmeno.trim().toLowerCase();
  if (prijmeni === "") return [];

  const podminky = [
    sql`lower(${histT.prijmeni}) = ${prijmeni}`,
    jmeno !== "" ? sql`lower(${histT.jmeno}) = ${jmeno}` : undefined,
    // Rok narození párujeme jen když ho známe (jinak shoda dvou lidí stejného jména).
    osoba.rokNarozeni != null
      ? eq(histT.rokNarozeni, osoba.rokNarozeni)
      : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({
      rok: histT.rok,
      akceNazev: histT.akceNazev,
      kategorie: histT.kategorie,
      poradi: histT.poradi,
      casMs: histT.casMs,
    })
    .from(histT)
    .where(and(...podminky))
    .orderBy(desc(histT.rok));

  return rows;
}

/** Vítěz jednoho ročníku (nejrychlejší čas dané kategorie pohlaví). */
export interface VitezRocniku {
  jmeno: string;
  casMs: number;
}

/** Ročník historie s absolutními vítězi M/Ž (pro projekci). */
export interface HistorieRocnik {
  rok: number;
  akceNazev: string;
  muz: VitezRocniku | null;
  zena: VitezRocniku | null;
}

/**
 * Vítězové po ročnících z `historicky_vysledek` — pro obrazovku projekce.
 * Seskupí dle (název, rok), v každém vezme nejrychlejší muže a ženu.
 * Seřazeno od nejnovějšího ročníku.
 */
export async function nactiVitezeHistorie(): Promise<HistorieRocnik[]> {
  const rows = await db
    .select({
      rok: histT.rok,
      akceNazev: histT.akceNazev,
      pohlavi: histT.pohlavi,
      prijmeni: histT.prijmeni,
      jmeno: histT.jmeno,
      casMs: histT.casMs,
    })
    .from(histT);

  const skupiny = new Map<string, HistorieRocnik>();
  for (const r of rows) {
    const klic = `${r.akceNazev}|${r.rok}`;
    let g = skupiny.get(klic);
    if (!g) {
      g = { rok: r.rok, akceNazev: r.akceNazev, muz: null, zena: null };
      skupiny.set(klic, g);
    }
    const jmeno = `${r.prijmeni} ${r.jmeno}`.trim();
    const kandidat: VitezRocniku = { jmeno, casMs: r.casMs };
    if (r.pohlavi === "M") {
      if (!g.muz || r.casMs < g.muz.casMs) g.muz = kandidat;
    } else if (r.pohlavi === "Z") {
      if (!g.zena || r.casMs < g.zena.casMs) g.zena = kandidat;
    }
  }

  return [...skupiny.values()].sort((a, b) => b.rok - a.rok);
}
