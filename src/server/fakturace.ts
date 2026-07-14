"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { akce as akceT, webObsah } from "@/db/schema";
import { vyzadujSuperAdmina } from "@/auth/guard";

const KLIC = "fakturace";

export interface FakturaceKonfig {
  cenaZaAkci: number; // Kč za jednu akci
  ucet: string; // účet platformy (pro QR), např. 19-2000145399/0800 nebo IBAN
  firma: string; // popis platby (název platformy)
}

const VYCHOZI: FakturaceKonfig = { cenaZaAkci: 0, ucet: "", firma: "" };

const schema = z.object({
  cenaZaAkci: z.coerce.number().int().min(0).max(1_000_000),
  ucet: z.string().trim().max(60),
  firma: z.string().trim().max(120),
});

/** Načte globální konfiguraci fakturace (jen globální admin). */
export async function nactiFakturaceKonfig(): Promise<FakturaceKonfig> {
  await vyzadujSuperAdmina();
  try {
    const row = await db.query.webObsah.findFirst({
      where: eq(webObsah.klic, KLIC),
    });
    return { ...VYCHOZI, ...((row?.data as Partial<FakturaceKonfig>) ?? {}) };
  } catch {
    return VYCHOZI;
  }
}

/** Uloží konfiguraci fakturace. */
export async function ulozitFakturaceKonfig(formData: FormData): Promise<void> {
  await vyzadujSuperAdmina();
  const data = schema.parse({
    cenaZaAkci: formData.get("cenaZaAkci"),
    ucet: formData.get("ucet"),
    firma: formData.get("firma"),
  });
  await db
    .insert(webObsah)
    .values({ klic: KLIC, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: webObsah.klic,
      set: { data, updatedAt: new Date() },
    });
  revalidatePath("/admin/zakaznici");
}

/** Označí všechny neuhrazené akce pořadatele jako uhrazené. */
export async function oznacitUhrazenoOrganizatora(
  uzivatelId: string,
): Promise<void> {
  await vyzadujSuperAdmina();
  await db
    .update(akceT)
    .set({ fakturaceUhrazeno: true })
    .where(
      and(eq(akceT.uzivatelId, uzivatelId), eq(akceT.fakturaceUhrazeno, false)),
    );
  revalidatePath("/admin/zakaznici");
}

/** Přepne stav úhrady u jedné akce (detail zákazníka). */
export async function oznacitAkciUhrazeno(
  akceId: string,
  uhrazeno: boolean,
): Promise<void> {
  await vyzadujSuperAdmina();
  await db
    .update(akceT)
    .set({ fakturaceUhrazeno: uhrazeno })
    .where(eq(akceT.id, akceId));
  revalidatePath("/admin/zakaznici");
}
