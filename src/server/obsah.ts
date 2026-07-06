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

const KLIC = "landing";

/**
 * Načte texty landing page z DB a sloučí přes výchozí (doplní chybějící pole).
 * Když tabulka/řádek chybí (čerstvá DB, neproběhlá migrace), vrátí výchozí —
 * landing se tak vždy vykreslí. Volá se z veřejné `/` i z admin editace.
 */
export async function nactiLandingObsah(): Promise<LandingObsah> {
  try {
    const row = await db.query.webObsah.findFirst({
      where: eq(webObsah.klic, KLIC),
    });
    return slouciObsah(row?.data);
  } catch {
    return slouciObsah(undefined);
  }
}

/**
 * Uloží texty landing page (z admin editace). Validuje přes zod, upsertuje
 * JSON do `web_obsah` a revaliduje veřejnou `/` i admin editaci.
 */
export async function ulozitLandingObsah(payload: unknown): Promise<void> {
  await vyzadujPrihlaseni();
  const data = landingObsahSchema.parse(payload);

  await db
    .insert(webObsah)
    .values({ klic: KLIC, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: webObsah.klic,
      set: { data, updatedAt: new Date() },
    });

  revalidatePath("/");
  revalidatePath("/admin/obsah");
}
