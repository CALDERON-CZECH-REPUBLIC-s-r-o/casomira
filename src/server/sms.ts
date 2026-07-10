"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { webObsah } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";

/**
 * Globální konfigurace SMS brány (gosms.eu). Uložena v `web_obsah` (klíč `sms`)
 * jako JSON. Zatím jen konfigurace — samotné odesílání SMS se dodá při napojení.
 */
const KLIC = "sms";

export interface SmsKonfig {
  povoleno: boolean;
  clientId: string;
  clientSecret: string;
  kanal: string; // ID kanálu / odesílatel v gosms
}

const VYCHOZI: SmsKonfig = {
  povoleno: false,
  clientId: "",
  clientSecret: "",
  kanal: "",
};

const schema = z.object({
  povoleno: z.boolean(),
  clientId: z.string().trim(),
  clientSecret: z.string().trim(),
  kanal: z.string().trim(),
});

/** Načte konfiguraci SMS brány (default prázdná). */
export async function nactiSmsKonfig(): Promise<SmsKonfig> {
  await vyzadujPrihlaseni();
  try {
    const row = await db.query.webObsah.findFirst({
      where: eq(webObsah.klic, KLIC),
    });
    return { ...VYCHOZI, ...((row?.data as Partial<SmsKonfig>) ?? {}) };
  } catch {
    return VYCHOZI;
  }
}

/** Uloží konfiguraci SMS brány. */
export async function ulozitSmsKonfig(formData: FormData): Promise<void> {
  await vyzadujPrihlaseni();
  const data = schema.parse({
    povoleno: formData.get("povoleno") === "on",
    clientId: formData.get("clientId") ?? "",
    clientSecret: formData.get("clientSecret") ?? "",
    kanal: formData.get("kanal") ?? "",
  });

  await db
    .insert(webObsah)
    .values({ klic: KLIC, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: webObsah.klic,
      set: { data, updatedAt: new Date() },
    });

  revalidatePath("/admin/sms");
}
