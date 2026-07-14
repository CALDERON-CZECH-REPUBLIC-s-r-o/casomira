"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  akce as akceT,
  zavodnik as zavT,
  historickyVysledek as histT,
} from "@/db/schema";
import { vyzadujSchvaleneho, overitVlastnictviAkce } from "@/auth/guard";
import { odhadniPohlaviZeJmena } from "@/lib/pohlavi";

const radekSchema = z.object({
  prijmeni: z.string().trim().min(1),
  jmeno: z.string().trim().default(""),
  rokNarozeni: z.number().int().min(1900).max(2100).nullable(),
  oddil: z.string().trim().nullable(),
  kategorie: z.string().trim().nullable(),
  poradi: z.number().int().positive().nullable(),
  casMs: z.number().int().positive(),
});

/**
 * Import historických výsledků jednoho ročníku do samostatné tabulky
 * `historicky_vysledek`. NESAHÁ na `zavodnik` ani `akce` — historie je jen
 * statistika, nesmí zasáhnout startovní listinu ani měření živé akce.
 * Validace po řádcích (nevalidní řádek se přeskočí, nezruší celý import).
 */
export async function importovatHistorii(
  rok: number,
  akceNazev: string,
  vstup: unknown,
): Promise<{ ok: boolean; vlozeno: number; chyba?: string }> {
  await vyzadujSchvaleneho();

  const nazev = (akceNazev ?? "").trim();
  if (!Number.isInteger(rok) || rok < 1900 || rok > 2100) {
    return { ok: false, vlozeno: 0, chyba: "Zadej platný rok (ročník)." };
  }
  if (nazev === "") {
    return { ok: false, vlozeno: 0, chyba: "Zadej název akce / ročníku." };
  }
  if (!Array.isArray(vstup)) {
    return { ok: false, vlozeno: 0, chyba: "Neplatná data importu." };
  }

  const platneRadky = vstup
    .map((x) => radekSchema.safeParse(x))
    .filter((r) => r.success)
    .map((r) => r.data);
  if (platneRadky.length === 0) {
    return {
      ok: false,
      vlozeno: 0,
      chyba: "Žádné platné výsledky — zkontroluj mapování Příjmení a Času.",
    };
  }

  const radky = platneRadky.map((r) => ({
    prijmeni: r.prijmeni,
    jmeno: r.jmeno,
    rokNarozeni: r.rokNarozeni,
    pohlavi: odhadniPohlaviZeJmena(r.jmeno, r.prijmeni),
    rok,
    akceNazev: nazev,
    kategorie: r.kategorie,
    oddil: r.oddil,
    poradi: r.poradi,
    casMs: r.casMs,
  }));

  await db.insert(histT).values(radky);
  revalidatePath("/admin/historie");
  return { ok: true, vlozeno: radky.length };
}

/** Smaže celý ročník historie (dle názvu + roku). */
export async function smazatHistoriiRocnik(
  akceNazev: string,
  rok: number,
): Promise<void> {
  await vyzadujSchvaleneho();
  await db
    .delete(histT)
    .where(and(eq(histT.akceNazev, akceNazev), eq(histT.rok, rok)));
  revalidatePath("/admin/historie");
}

/**
 * Náprava chybně naimportovaných historických výsledků, které se dřív vkládaly
 * přímo do `zavodnik` (a zaneřádily startovní listinu). Přesune všechny závodníky
 * dané akce s vyplněným `cistyCasImportMs` do `historicky_vysledek`, odstraní je
 * ze `zavodnik` a zruší příznak `historicka`. Reálné přihlášky/měření zůstanou.
 */
export async function migrovatHistoriiZeZavodniku(
  akceId: string,
): Promise<{ ok: boolean; presunuto: number; chyba?: string }> {
  await overitVlastnictviAkce(akceId);

  const ak = await db.query.akce.findFirst({
    where: eq(akceT.id, akceId),
    columns: { rok: true, nazev: true },
  });
  if (!ak) return { ok: false, presunuto: 0, chyba: "Akce neexistuje." };

  const importovani = await db.query.zavodnik.findMany({
    where: and(eq(zavT.akceId, akceId), isNotNull(zavT.cistyCasImportMs)),
  });
  if (importovani.length === 0) {
    await db.update(akceT).set({ historicka: false }).where(eq(akceT.id, akceId));
    return { ok: true, presunuto: 0 };
  }

  const radky = importovani.map((z) => ({
    prijmeni: z.prijmeni,
    jmeno: z.jmeno,
    rokNarozeni: z.rokNarozeni,
    pohlavi: z.pohlavi,
    rok: ak.rok,
    akceNazev: ak.nazev,
    kategorie: null,
    oddil: z.oddil,
    poradi: null,
    casMs: z.cistyCasImportMs!,
  }));

  await db.insert(histT).values(radky);
  await db
    .delete(zavT)
    .where(and(eq(zavT.akceId, akceId), isNotNull(zavT.cistyCasImportMs)));
  await db.update(akceT).set({ historicka: false }).where(eq(akceT.id, akceId));

  revalidatePath(`/admin/akce/${akceId}/zavodnici`);
  revalidatePath(`/admin/akce/${akceId}`);
  revalidatePath("/admin/historie");
  return { ok: true, presunuto: radky.length };
}

/** Void obal `migrovatHistoriiZeZavodniku` pro použití v ConfirmDialog (bind). */
export async function spustitMigraciHistorie(akceId: string): Promise<void> {
  await migrovatHistoriiZeZavodniku(akceId);
}
