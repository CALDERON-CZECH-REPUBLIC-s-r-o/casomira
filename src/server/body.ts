"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { mericiBod } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";

const cisloNeboNull = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().optional(),
);

const bodSchema = z.object({
  nazev: z.string().trim().min(1, "Název je povinný"),
  poradi: cisloNeboNull,
  vzdalenostM: cisloNeboNull,
  typ: z.enum(["startovni", "prubezna", "cilova"]),
  zarizeni: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().optional(),
  ),
});

function parseForm(formData: FormData) {
  return bodSchema.parse({
    nazev: formData.get("nazev"),
    poradi: formData.get("poradi"),
    vzdalenostM: formData.get("vzdalenostM"),
    typ: formData.get("typ"),
    zarizeni: formData.get("zarizeni"),
  });
}

function revalidovat(akceId: string) {
  revalidatePath(`/admin/akce/${akceId}/brany`);
  revalidatePath(`/admin/akce/${akceId}`);
}

export async function vytvoritBod(akceId: string, formData: FormData) {
  await vyzadujPrihlaseni();
  const d = parseForm(formData);
  await db.insert(mericiBod).values({
    akceId,
    nazev: d.nazev,
    poradi: d.poradi ?? 0,
    vzdalenostM: d.vzdalenostM ?? null,
    typ: d.typ,
    zarizeni: d.zarizeni ?? null,
  });
  revalidovat(akceId);
}

export async function upravitBod(
  bodId: string,
  akceId: string,
  formData: FormData,
) {
  await vyzadujPrihlaseni();
  const d = parseForm(formData);
  await db
    .update(mericiBod)
    .set({
      nazev: d.nazev,
      poradi: d.poradi ?? 0,
      vzdalenostM: d.vzdalenostM ?? null,
      typ: d.typ,
      zarizeni: d.zarizeni ?? null,
    })
    .where(eq(mericiBod.id, bodId));
  revalidovat(akceId);
}

export async function smazatBod(bodId: string, akceId: string) {
  await vyzadujPrihlaseni();
  // FK na cilovy_zaznam.bod_id je set null → průchody přežijí bez bodu.
  await db.delete(mericiBod).where(eq(mericiBod.id, bodId));
  revalidovat(akceId);
}

/**
 * Nastaví právě jeden cílový bod na akci: nejdřív shodí příznak všem bodům
 * akce, pak ho zapne (a nastaví typ 'cilova') vybranému bodu.
 */
export async function nastavitCilovyBod(bodId: string, akceId: string) {
  await vyzadujPrihlaseni();
  await db
    .update(mericiBod)
    .set({ jeCil: false })
    .where(eq(mericiBod.akceId, akceId));
  await db
    .update(mericiBod)
    .set({ jeCil: true, typ: "cilova" })
    .where(eq(mericiBod.id, bodId));
  revalidovat(akceId);
}
