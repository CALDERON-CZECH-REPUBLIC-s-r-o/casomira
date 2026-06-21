"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import {
  cilovyZaznam,
  zavodnik as zavT,
  upravaLog,
} from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { inputNaCas, casDne } from "@/lib/cas";

async function zapisLog(akceId: string, popis: string, zaznamId?: string) {
  await db.insert(upravaLog).values({ akceId, popis, zaznamId });
}

/** Přesměruje zpět na stránku oprav s chybovou hláškou. */
function chybaRedirect(akceId: string, msg: string): never {
  redirect(`/admin/akce/${akceId}/opravy?chyba=${encodeURIComponent(msg)}`);
}

function revalid(akceId: string) {
  revalidatePath(`/admin/akce/${akceId}/opravy`);
  revalidatePath(`/admin/akce/${akceId}/zavodnici`);
  revalidatePath(`/admin/akce/${akceId}/mereni`);
}

/** Najde id závodníka dle startovního čísla (nebo null). */
async function zavodnikDleCisla(akceId: string, cislo: number | null) {
  if (cislo === null) return null;
  const z = await db.query.zavodnik.findFirst({
    where: and(eq(zavT.akceId, akceId), eq(zavT.startovniCislo, cislo)),
    columns: { id: true },
  });
  return z?.id ?? null;
}

/** Ruční vložení vynechaného průchodu (čas dne + volitelně číslo). */
export async function vlozitRucniPruchod(akceId: string, formData: FormData) {
  await vyzadujPrihlaseni();
  const casStr = String(formData.get("cas") ?? "").trim();
  const cisloRaw = String(formData.get("cislo") ?? "").trim();
  const datum = String(formData.get("datum") ?? "").trim(); // YYYY-MM-DD akce

  const cas = inputNaCas(new Date(datum + "T00:00:00"), casStr);
  if (!cas) chybaRedirect(akceId, "Neplatný čas (formát HH:mm:ss.SSS).");

  const cislo = cisloRaw ? parseInt(cisloRaw.replace(/\D/g, ""), 10) : null;
  const platneCislo = cislo !== null && Number.isFinite(cislo) ? cislo : null;
  const zavodnikId = await zavodnikDleCisla(akceId, platneCislo);

  const max = await db
    .select({ m: sql<number>`coalesce(max(${cilovyZaznam.poradiDoteku}), 0)` })
    .from(cilovyZaznam)
    .where(eq(cilovyZaznam.akceId, akceId));
  const poradi = (max[0]?.m ?? 0) + 1;

  await db.insert(cilovyZaznam).values({
    clientId: randomUUID(),
    akceId,
    casCile: cas,
    startovniCislo: platneCislo,
    zavodnikId,
    stav: platneCislo !== null ? "platny" : "neprirazeno",
    poradiDoteku: poradi,
    poznamka: "ručně vloženo",
    editedAt: new Date(),
  });

  await zapisLog(
    akceId,
    `Ruční vložení průchodu v ${casDne(cas)}${platneCislo !== null ? `, číslo ${platneCislo}` : " (bez čísla)"}`,
  );
  revalid(akceId);
}

/** Ruční oprava času průchodu (oprava překlepu). Mění razítko cíle. */
export async function upravitCasZaznamu(
  zaznamId: string,
  akceId: string,
  formData: FormData,
) {
  await vyzadujPrihlaseni();
  const casStr = String(formData.get("cas") ?? "").trim();
  const z = await db.query.cilovyZaznam.findFirst({
    where: eq(cilovyZaznam.id, zaznamId),
    columns: { casCile: true },
  });
  if (!z) chybaRedirect(akceId, "Záznam nenalezen.");
  const novy = inputNaCas(z.casCile, casStr);
  if (!novy) chybaRedirect(akceId, "Neplatný čas (formát HH:mm:ss.SSS).");

  await db
    .update(cilovyZaznam)
    .set({ casCile: novy, editedAt: new Date() })
    .where(eq(cilovyZaznam.id, zaznamId));

  await zapisLog(
    akceId,
    `Oprava času: ${casDne(z.casCile)} → ${casDne(novy)}`,
    zaznamId,
  );
  revalid(akceId);
}

/** Změna / doplnění startovního čísla u průchodu. */
export async function upravitCisloZaznamu(
  zaznamId: string,
  akceId: string,
  formData: FormData,
) {
  await vyzadujPrihlaseni();
  const cisloRaw = String(formData.get("cislo") ?? "").trim();
  const cislo = cisloRaw ? parseInt(cisloRaw.replace(/\D/g, ""), 10) : null;
  const platneCislo = cislo !== null && Number.isFinite(cislo) ? cislo : null;
  const zavodnikId = await zavodnikDleCisla(akceId, platneCislo);

  await db
    .update(cilovyZaznam)
    .set({
      startovniCislo: platneCislo,
      zavodnikId,
      stav: platneCislo !== null ? "platny" : "neprirazeno",
      editedAt: new Date(),
    })
    .where(eq(cilovyZaznam.id, zaznamId));

  await zapisLog(
    akceId,
    platneCislo !== null
      ? `Přiřazeno číslo ${platneCislo} k průchodu`
      : `Odebráno číslo z průchodu`,
    zaznamId,
  );
  revalid(akceId);
}

/** Nastaví stav průchodu (platný / DNF / smazaný / neprirazeno). */
export async function zmenitStavZaznamu(
  zaznamId: string,
  akceId: string,
  stav: "platny" | "neprirazeno" | "smazany" | "DNF",
) {
  await vyzadujPrihlaseni();
  await db
    .update(cilovyZaznam)
    .set({ stav, editedAt: new Date() })
    .where(eq(cilovyZaznam.id, zaznamId));
  await zapisLog(akceId, `Stav průchodu změněn na ${stav}`, zaznamId);
  revalid(akceId);
}

/** Nastaví stav závodníka (přihlášen / DNS / DSQ). */
export async function nastavitStavZavodnika(
  zavodnikId: string,
  akceId: string,
  stav: "prihlasen" | "nenastoupil_DNS" | "diskvalifikovan_DSQ",
) {
  await vyzadujPrihlaseni();
  const z = await db.query.zavodnik.findFirst({
    where: eq(zavT.id, zavodnikId),
    columns: { prijmeni: true, jmeno: true },
  });
  await db.update(zavT).set({ stav }).where(eq(zavT.id, zavodnikId));
  const label =
    stav === "nenastoupil_DNS"
      ? "DNS"
      : stav === "diskvalifikovan_DSQ"
        ? "DSQ"
        : "přihlášen";
  await zapisLog(
    akceId,
    `Stav závodníka ${z ? `${z.prijmeni} ${z.jmeno}` : ""} → ${label}`,
  );
  revalid(akceId);
}
