"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { akce as akceT, cilovyZaznam, zavodnik as zavT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";

const pruchodSchema = z.object({
  clientId: z.string().uuid(),
  casCile: z.string().datetime({ offset: true }),
  startovniCislo: z.number().int().positive().nullable(),
  stav: z.enum(["platny", "neprirazeno", "smazany", "DNF"]),
  poradiDoteku: z.number().int(),
});

export interface VysledekUlozeni {
  clientId: string;
  zavodnik: { id: string; jmeno: string; prijmeni: string } | null;
  cisloExistuje: boolean;
}

/**
 * Idempotentní dávkový upsert průchodů podle `client_id` (SPEC 7.2/7.5).
 * Opakované odeslání téhož průchodu (replay z outboxu) je bezpečné — řádek se
 * jen aktualizuje. Server doplní `zavodnik_id` podle startovního čísla.
 * Vrací pro každý průchod, zda číslo odpovídá existujícímu závodníkovi.
 */
export async function ulozitPruchody(
  akceId: string,
  vstup: unknown,
): Promise<VysledekUlozeni[]> {
  await vyzadujPrihlaseni();

  const parsed = z.array(pruchodSchema).safeParse(vstup);
  if (!parsed.success) return [];
  const items = parsed.data;
  if (items.length === 0) return [];

  // Mapa startovní číslo → závodník (pro doplnění zavodnik_id a kontrolu existence).
  const zavodnici = await db.query.zavodnik.findMany({
    where: eq(zavT.akceId, akceId),
    columns: { id: true, jmeno: true, prijmeni: true, startovniCislo: true },
  });
  const dleCisla = new Map(
    zavodnici
      .filter((z) => z.startovniCislo !== null)
      .map((z) => [z.startovniCislo as number, z]),
  );

  const vysledky: VysledekUlozeni[] = [];

  for (const it of items) {
    const zav =
      it.startovniCislo !== null ? dleCisla.get(it.startovniCislo) ?? null : null;

    await db
      .insert(cilovyZaznam)
      .values({
        clientId: it.clientId,
        akceId,
        casCile: new Date(it.casCile),
        startovniCislo: it.startovniCislo,
        zavodnikId: zav?.id ?? null,
        stav: it.stav,
        poradiDoteku: it.poradiDoteku,
      })
      .onConflictDoUpdate({
        target: cilovyZaznam.clientId,
        set: {
          startovniCislo: it.startovniCislo,
          zavodnikId: zav?.id ?? null,
          stav: it.stav,
          editedAt: new Date(),
        },
      });

    vysledky.push({
      clientId: it.clientId,
      zavodnik: zav
        ? { id: zav.id, jmeno: zav.jmeno, prijmeni: zav.prijmeni }
        : null,
      cisloExistuje:
        it.startovniCislo === null ? true : dleCisla.has(it.startovniCislo),
    });
  }

  return vysledky;
}

/** Nastaví/posune čas hromadného startu akce (z měřicí obrazovky). */
export async function nastavitStart(akceId: string, casISO: string | null) {
  await vyzadujPrihlaseni();
  await db
    .update(akceT)
    .set({ casStartu: casISO ? new Date(casISO) : null })
    .where(eq(akceT.id, akceId));
}
