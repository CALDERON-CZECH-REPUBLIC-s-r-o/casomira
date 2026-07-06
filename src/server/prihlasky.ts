"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  akce as akceT,
  kategorie as katT,
  zavodnik as zavT,
  prihlaska as prihT,
} from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { zaradit } from "@/domain/zarazeni";
import { odhadniPohlaviZeJmena, type Pohlavi } from "@/lib/pohlavi";
import { ucetNaIban, spayd } from "@/lib/platba";
import { qrSvgDataUri } from "@/lib/qr";

/* ---------- Sdílené ---------- */

/** Zařadí do kategorie dle aktuálních kategorií akce (nebo null). */
async function zaraditDoKategorie(
  akceId: string,
  rok: number,
  z: { pohlavi: Pohlavi | null; rokNarozeni: number | null },
): Promise<string | null> {
  const kategorie = await db.query.kategorie.findMany({
    where: eq(katT.akceId, akceId),
  });
  return zaradit({ pohlavi: z.pohlavi, rokNarozeni: z.rokNarozeni }, kategorie, rok);
}

/** Založí závodníka z přihlášky (bez startovního čísla) a vrátí jeho id. */
async function zalozZavodnikaZPrihlasky(p: {
  akceId: string;
  jmeno: string;
  prijmeni: string;
  rokNarozeni: number | null;
  pohlavi: Pohlavi | null;
  oddil: string | null;
}): Promise<string> {
  const ak = await db.query.akce.findFirst({
    where: eq(akceT.id, p.akceId),
    columns: { rok: true },
  });
  const kategorieId = await zaraditDoKategorie(p.akceId, ak?.rok ?? 0, {
    pohlavi: p.pohlavi,
    rokNarozeni: p.rokNarozeni,
  });
  const [nova] = await db
    .insert(zavT)
    .values({
      akceId: p.akceId,
      jmeno: p.jmeno,
      prijmeni: p.prijmeni,
      rokNarozeni: p.rokNarozeni,
      pohlavi: p.pohlavi,
      oddil: p.oddil,
      kategorieId,
    })
    .returning({ id: zavT.id });
  return nova.id;
}

/* ---------- Veřejné přihlášení ---------- */

const prihlaskaSchema = z.object({
  jmeno: z.string().trim().max(80).default(""),
  prijmeni: z.string().trim().min(1, "Zadejte příjmení.").max(80),
  rokNarozeni: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1900).max(2100).optional(),
  ),
  oddil: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(120).optional(),
  ),
  telefon: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(40).optional(),
  ),
  email: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().email("Neplatný e-mail.").max(120).optional(),
  ),
});

export type PrihlaskaState =
  | { stav: "idle" }
  | { stav: "chyba"; zprava: string }
  | {
      stav: "ok";
      vs: string;
      castka: number | null;
      ucet: string | null;
      qrDataUri: string | null;
    };

/**
 * Veřejná přihláška na akci (bez přihlášení organizátora). Honeypot proti botům,
 * validace, přidělení VS, odhad pohlaví. Bez schvalování → rovnou závodník do
 * startovky. Vrací stav pro `useActionState` vč. QR platby za startovné.
 */
export async function prihlasitSeNaAkci(
  slug: string,
  _prev: PrihlaskaState,
  formData: FormData,
): Promise<PrihlaskaState> {
  // Honeypot: skryté pole `web` vyplní jen bot → tvař se úspěšně, ale nic neukládej.
  if ((formData.get("web") as string)?.trim()) {
    return { stav: "ok", vs: "", castka: null, ucet: null, qrDataUri: null };
  }

  const parsed = prihlaskaSchema.safeParse({
    jmeno: formData.get("jmeno"),
    prijmeni: formData.get("prijmeni"),
    rokNarozeni: formData.get("rokNarozeni"),
    oddil: formData.get("oddil"),
    telefon: formData.get("telefon"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      stav: "chyba",
      zprava: parsed.error.issues[0]?.message ?? "Zkontrolujte údaje.",
    };
  }
  const d = parsed.data;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.slug, slug) });
  if (!akce || !akce.registraceOtevrena) {
    return { stav: "chyba", zprava: "Přihlašování na tuto akci není otevřené." };
  }

  // Variabilní symbol = nejvyšší číselné VS v akci + 1 (jinak 1).
  const existujici = await db.query.prihlaska.findMany({
    where: eq(prihT.akceId, akce.id),
    columns: { variabilniSymbol: true },
  });
  const maxVs = existujici.reduce((m, p) => {
    const n = Number(p.variabilniSymbol);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  const vs = String(maxVs + 1);

  const pohlavi = odhadniPohlaviZeJmena(d.jmeno, d.prijmeni);
  const rokNarozeni = d.rokNarozeni ?? null;
  const schvalovat = akce.registraceSchvalovani;

  // Bez schvalování → rovnou závodník ve startovce.
  let zavodnikId: string | null = null;
  if (!schvalovat) {
    zavodnikId = await zalozZavodnikaZPrihlasky({
      akceId: akce.id,
      jmeno: d.jmeno,
      prijmeni: d.prijmeni,
      rokNarozeni,
      pohlavi,
      oddil: d.oddil ?? null,
    });
  }

  await db.insert(prihT).values({
    akceId: akce.id,
    jmeno: d.jmeno,
    prijmeni: d.prijmeni,
    rokNarozeni,
    oddil: d.oddil ?? null,
    telefon: d.telefon ?? null,
    email: d.email ?? null,
    pohlavi,
    stav: schvalovat ? "nova" : "schvalena",
    variabilniSymbol: vs,
    zavodnikId,
  });

  // QR platba za startovné (jen když je účet i částka).
  let qrDataUri: string | null = null;
  const castka = akce.startovne ?? null;
  const iban = ucetNaIban(akce.ucet);
  if (iban && castka && castka > 0) {
    const kod = spayd({
      iban,
      castka,
      vs,
      zprava: `Startovne ${akce.nazev}`,
    });
    qrDataUri = await qrSvgDataUri(kod);
  }

  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/akce/${akce.id}/prihlasky`);
  revalidatePath(`/admin/akce/${akce.id}`);

  return { stav: "ok", vs, castka, ucet: akce.ucet, qrDataUri };
}

/* ---------- Administrace přihlášek ---------- */

/** Načte přihlášku + slug akce (pro revalidaci). */
async function nactiPrihlasku(id: string) {
  const p = await db.query.prihlaska.findFirst({ where: eq(prihT.id, id) });
  if (!p) return null;
  const ak = await db.query.akce.findFirst({
    where: eq(akceT.id, p.akceId),
    columns: { slug: true },
  });
  return { p, slug: ak?.slug };
}

function revalidatePrihlasky(akceId: string, slug?: string) {
  revalidatePath(`/admin/akce/${akceId}/prihlasky`);
  revalidatePath(`/admin/akce/${akceId}`);
  if (slug) revalidatePath(`/${slug}`);
}

/** Schválí přihlášku → založí (pokud ještě není) závodníka ve startovce. */
export async function schvalitPrihlasku(id: string) {
  await vyzadujPrihlaseni();
  const nacteno = await nactiPrihlasku(id);
  if (!nacteno) return;
  const { p, slug } = nacteno;

  let zavodnikId = p.zavodnikId;
  if (!zavodnikId) {
    zavodnikId = await zalozZavodnikaZPrihlasky({
      akceId: p.akceId,
      jmeno: p.jmeno,
      prijmeni: p.prijmeni,
      rokNarozeni: p.rokNarozeni,
      pohlavi: p.pohlavi,
      oddil: p.oddil,
    });
  }
  await db
    .update(prihT)
    .set({ stav: "schvalena", zavodnikId })
    .where(eq(prihT.id, id));
  revalidatePrihlasky(p.akceId, slug);
}

/** Zamítne přihlášku (do startovky se nedostane). */
export async function zamitnoutPrihlasku(id: string) {
  await vyzadujPrihlaseni();
  const nacteno = await nactiPrihlasku(id);
  if (!nacteno) return;
  await db.update(prihT).set({ stav: "zamitnuta" }).where(eq(prihT.id, id));
  revalidatePrihlasky(nacteno.p.akceId, nacteno.slug);
}

/** Přepne stav úhrady startovného. */
export async function oznacitZaplaceno(id: string, zaplaceno: boolean) {
  await vyzadujPrihlaseni();
  const nacteno = await nactiPrihlasku(id);
  if (!nacteno) return;
  await db.update(prihT).set({ zaplaceno }).where(eq(prihT.id, id));
  revalidatePrihlasky(nacteno.p.akceId, nacteno.slug);
}

/** Smaže přihlášku (navázaného závodníka ponechá; odpojí se přes set null). */
export async function smazatPrihlasku(id: string) {
  await vyzadujPrihlaseni();
  const nacteno = await nactiPrihlasku(id);
  if (!nacteno) return;
  await db.delete(prihT).where(eq(prihT.id, id));
  revalidatePrihlasky(nacteno.p.akceId, nacteno.slug);
}
