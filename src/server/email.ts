"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { webObsah } from "@/db/schema";
import { vyzadujSuperAdmina } from "@/auth/guard";
import {
  KLIC_EMAIL,
  VYCHOZI_EMAIL,
  nactiEmailKonfigInterni,
  odeslatTest,
  type EmailKonfig,
} from "@/lib/mailer";

const schema = z.object({
  povoleno: z.coerce.boolean(),
  host: z.string().trim().max(120),
  port: z.coerce.number().int().min(1).max(65535),
  uzivatel: z.string().trim().max(160),
  heslo: z.string().max(400),
  odesilatel: z.string().trim().max(160),
  adminEmail: z.string().trim().max(160),
});

/** Načte konfiguraci mailera (jen globální admin, pro předvyplnění formuláře). */
export async function nactiEmailKonfig(): Promise<EmailKonfig> {
  await vyzadujSuperAdmina();
  return nactiEmailKonfigInterni();
}

/** Uloží konfiguraci mailera. */
export async function ulozitEmailKonfig(formData: FormData): Promise<void> {
  await vyzadujSuperAdmina();
  const data = schema.parse({
    povoleno: formData.get("povoleno") ? true : false,
    host: formData.get("host") || VYCHOZI_EMAIL.host,
    port: formData.get("port") || VYCHOZI_EMAIL.port,
    uzivatel: formData.get("uzivatel") ?? "",
    heslo: formData.get("heslo") ?? "",
    odesilatel: formData.get("odesilatel") ?? "",
    adminEmail: formData.get("adminEmail") ?? "",
  });
  await db
    .insert(webObsah)
    .values({ klic: KLIC_EMAIL, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: webObsah.klic,
      set: { data, updatedAt: new Date() },
    });
  revalidatePath("/admin/email");
}

export type TestStav =
  | { stav: "idle" }
  | { stav: "ok"; zprava: string }
  | { stav: "chyba"; zprava: string };

/** Odešle testovací e-mail dle aktuálně uložené konfigurace. */
export async function poslatTestEmail(
  _prev: TestStav,
  formData: FormData,
): Promise<TestStav> {
  await vyzadujSuperAdmina();
  const komu = String(formData.get("komu") ?? "").trim();
  if (!komu) return { stav: "chyba", zprava: "Zadej adresu příjemce." };
  const k = await nactiEmailKonfigInterni();
  try {
    await odeslatTest(k, komu);
    return { stav: "ok", zprava: `Test odeslán na ${komu}.` };
  } catch (e) {
    return {
      stav: "chyba",
      zprava: `Odeslání selhalo: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
