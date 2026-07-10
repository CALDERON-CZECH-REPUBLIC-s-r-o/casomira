"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { akce as akceT, kategorie as katT, zavodnik as zavT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { zaradit } from "@/domain/zarazeni";

const importZavodnikSchema = z.object({
  startovniCislo: z.number().int().positive().nullable(),
  prijmeni: z.string().trim().min(1),
  jmeno: z.string().trim().default(""),
  rokNarozeni: z.number().int().min(1900).max(2100).nullable(),
  pohlavi: z.enum(["M", "Z"]).nullable(),
  oddil: z.string().trim().nullable(),
  mesto: z.string().trim().nullable(),
  telefon: z.string().trim().nullable(),
});

export type ImportZavodnik = z.infer<typeof importZavodnikSchema>;

export interface VysledekImportu {
  ok: boolean;
  vlozeno: number;
  nezarazeno: number;
  chyby: string[];
}

/**
 * Uloží naimportované závodníky (append) a rovnou je auto-zařadí.
 * Klient už proběhl náhledem/validací; server validuje znovu a odmítne
 * konfliktní startovní čísla (unikátnost v rámci akce).
 */
export async function importovatZavodniky(
  akceId: string,
  vstup: unknown,
): Promise<VysledekImportu> {
  await vyzadujPrihlaseni();

  const parsed = z.array(importZavodnikSchema).safeParse(vstup);
  if (!parsed.success) {
    return { ok: false, vlozeno: 0, nezarazeno: 0, chyby: ["Neplatná data importu."] };
  }
  const zavodnici = parsed.data;
  if (zavodnici.length === 0) {
    return { ok: false, vlozeno: 0, nezarazeno: 0, chyby: ["Žádní závodníci k importu."] };
  }

  const ak = await db.query.akce.findFirst({ where: eq(akceT.id, akceId) });
  if (!ak) {
    return { ok: false, vlozeno: 0, nezarazeno: 0, chyby: ["Akce neexistuje."] };
  }

  const chyby: string[] = [];

  // Duplicity v rámci dávky.
  const cislaVDavce = new Map<number, number>();
  for (const z of zavodnici) {
    if (z.startovniCislo !== null) {
      cislaVDavce.set(
        z.startovniCislo,
        (cislaVDavce.get(z.startovniCislo) ?? 0) + 1,
      );
    }
  }
  for (const [cislo, pocet] of cislaVDavce) {
    if (pocet > 1) chyby.push(`Startovní číslo ${cislo} je v importu ${pocet}×.`);
  }

  // Duplicity proti existujícím závodníkům akce.
  const existujici = await db.query.zavodnik.findMany({
    where: eq(zavT.akceId, akceId),
    columns: { startovniCislo: true },
  });
  const obsazena = new Set(
    existujici
      .map((z) => z.startovniCislo)
      .filter((c): c is number => c !== null),
  );
  for (const cislo of cislaVDavce.keys()) {
    if (obsazena.has(cislo)) {
      chyby.push(`Startovní číslo ${cislo} už v akci existuje.`);
    }
  }

  if (chyby.length > 0) {
    return { ok: false, vlozeno: 0, nezarazeno: 0, chyby };
  }

  // Auto-zařazení.
  const kategorie = await db.query.kategorie.findMany({
    where: eq(katT.akceId, akceId),
  });

  let nezarazeno = 0;
  const radky = zavodnici.map((z) => {
    const kategorieId = zaradit(
      { pohlavi: z.pohlavi, rokNarozeni: z.rokNarozeni },
      kategorie,
      ak.rok,
    );
    if (kategorieId === null) nezarazeno += 1;
    return {
      akceId,
      jmeno: z.jmeno,
      prijmeni: z.prijmeni,
      rokNarozeni: z.rokNarozeni,
      pohlavi: z.pohlavi,
      startovniCislo: z.startovniCislo,
      oddil: z.oddil,
      mesto: z.mesto,
      telefon: z.telefon,
      kategorieId,
    };
  });

  await db.insert(zavT).values(radky);

  revalidatePath(`/admin/akce/${akceId}/zavodnici`);
  revalidatePath(`/admin/akce/${akceId}`);
  return { ok: true, vlozeno: radky.length, nezarazeno, chyby: [] };
}
