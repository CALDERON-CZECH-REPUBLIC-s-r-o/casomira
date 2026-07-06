"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { webObsah } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import {
  landingObsahSchema,
  slouciObsah,
  type LandingObsah,
} from "@/lib/landing-obsah";

/** Klíč řádku v `web_obsah` dle jazyka (cs = 'landing', en = 'landing-en'). */
function klicObsahu(locale: string): string {
  return locale === "en" ? "landing-en" : "landing";
}

/**
 * Načte texty landing page z DB pro daný jazyk a sloučí přes výchozí (doplní
 * chybějící pole). Když tabulka/řádek chybí, vrátí výchozí — landing se tak
 * vždy vykreslí. Volá se z veřejné `/` i z admin editace.
 */
export async function nactiLandingObsah(locale = "cs"): Promise<LandingObsah> {
  try {
    const row = await db.query.webObsah.findFirst({
      where: eq(webObsah.klic, klicObsahu(locale)),
    });
    return slouciObsah(row?.data, locale);
  } catch {
    return slouciObsah(undefined, locale);
  }
}

/**
 * Uloží texty landing page pro daný jazyk. Validuje přes zod, upsertuje JSON do
 * `web_obsah` a revaliduje veřejnou `/` (v obou locale) i admin editaci.
 */
export async function ulozitLandingObsah(
  locale: string,
  payload: unknown,
): Promise<void> {
  await vyzadujPrihlaseni();
  const data = landingObsahSchema.parse(payload);
  const klic = klicObsahu(locale);

  await db
    .insert(webObsah)
    .values({ klic, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: webObsah.klic,
      set: { data, updatedAt: new Date() },
    });

  revalidatePath("/", "layout");
  revalidatePath("/admin/obsah");
}
