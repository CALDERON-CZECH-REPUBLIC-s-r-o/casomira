"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { akce } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { slugify } from "@/lib/slug";

const akceSchema = z.object({
  nazev: z.string().trim().min(1, "Název je povinný"),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatné datum"),
  misto: z.string().trim().optional(),
  rok: z.coerce.number().int().min(1900).max(2100).optional(),
  poznamka: z.string().trim().optional(),
});

/** Vytvoří unikátní slug v rámci tabulky akce (přípona -2, -3 … při kolizi). */
async function unikatniSlug(zaklad: string, ignorujId?: string): Promise<string> {
  const base = slugify(zaklad) || "akce";
  let kandidat = base;
  let i = 1;
  for (;;) {
    const existuje = await db.query.akce.findFirst({
      where: ignorujId
        ? and(eq(akce.slug, kandidat), ne(akce.id, ignorujId))
        : eq(akce.slug, kandidat),
      columns: { id: true },
    });
    if (!existuje) return kandidat;
    i += 1;
    kandidat = `${base}-${i}`;
  }
}

export async function vytvoritAkci(formData: FormData) {
  await vyzadujPrihlaseni();
  const data = akceSchema.parse({
    nazev: formData.get("nazev"),
    datum: formData.get("datum"),
    misto: formData.get("misto") || undefined,
    rok: formData.get("rok") || undefined,
    poznamka: formData.get("poznamka") || undefined,
  });

  const rok = data.rok ?? Number(data.datum.slice(0, 4));
  const slug = await unikatniSlug(data.nazev);

  const [nova] = await db
    .insert(akce)
    .values({
      nazev: data.nazev,
      datum: data.datum,
      misto: data.misto,
      rok,
      slug,
      poznamka: data.poznamka,
    })
    .returning({ id: akce.id });

  revalidatePath("/admin/akce");
  redirect(`/admin/akce/${nova.id}`);
}

export async function upravitAkci(id: string, formData: FormData) {
  await vyzadujPrihlaseni();
  const data = akceSchema.parse({
    nazev: formData.get("nazev"),
    datum: formData.get("datum"),
    misto: formData.get("misto") || undefined,
    rok: formData.get("rok") || undefined,
    poznamka: formData.get("poznamka") || undefined,
  });

  const rok = data.rok ?? Number(data.datum.slice(0, 4));

  await db
    .update(akce)
    .set({
      nazev: data.nazev,
      datum: data.datum,
      misto: data.misto ?? null,
      rok,
      poznamka: data.poznamka ?? null,
    })
    .where(eq(akce.id, id));

  revalidatePath("/admin/akce");
  revalidatePath(`/admin/akce/${id}`);
  redirect(`/admin/akce/${id}`);
}

export async function smazatAkci(id: string) {
  await vyzadujPrihlaseni();
  await db.delete(akce).where(eq(akce.id, id));
  revalidatePath("/admin/akce");
  redirect("/admin/akce");
}

const prazdneUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const nastaveniSchema = z.object({
  slug: z.string().trim().optional(),
  verejna: z.boolean(),
  autoPublikace: z.boolean(),
  presnostCasu: z.enum(["sekundy", "desetiny", "setiny"]),
  delkaM: z.preprocess(prazdneUndef, z.coerce.number().int().positive().optional()),
});

/** Uloží nastavení akce (10a) — odkaz (slug), viditelnost, auto-publikace, přesnost, délka. */
export async function ulozitNastaveni(id: string, formData: FormData) {
  await vyzadujPrihlaseni();
  const d = nastaveniSchema.parse({
    slug: formData.get("slug"),
    verejna: formData.get("verejna") === "on",
    autoPublikace: formData.get("autoPublikace") === "on",
    presnostCasu: formData.get("presnostCasu"),
    delkaM: formData.get("delkaM"),
  });

  const stara = await db.query.akce.findFirst({
    where: eq(akce.id, id),
    columns: { slug: true },
  });

  // Odkaz (slug): slugify vstupu, zajisti unikátnost. Prázdný → ponech stávající.
  const zaklad = slugify(d.slug ?? "");
  const novySlug = zaklad
    ? await unikatniSlug(zaklad, id)
    : (stara?.slug ?? "akce");

  await db
    .update(akce)
    .set({
      slug: novySlug,
      verejna: d.verejna,
      autoPublikace: d.autoPublikace,
      presnostCasu: d.presnostCasu,
      delkaM: d.delkaM ?? null,
    })
    .where(eq(akce.id, id));

  revalidatePath(`/admin/akce/${id}/nastaveni`);
  revalidatePath(`/admin/akce/${id}`);
  // Veřejná cesta pod starým i novým slugem.
  if (stara?.slug) revalidatePath(`/${stara.slug}`);
  revalidatePath(`/${novySlug}`);
}

const prihlaskySchema = z.object({
  registraceOtevrena: z.boolean(),
  registraceSchvalovani: z.boolean(),
  ucet: z.preprocess(prazdneUndef, z.string().trim().optional()),
  startovne: z.preprocess(
    prazdneUndef,
    z.coerce.number().int().nonnegative().optional(),
  ),
});

/** Uloží nastavení veřejných přihlášek a plateb (toggly, bankovní účet, startovné). */
export async function ulozitPrihlasky(id: string, formData: FormData) {
  await vyzadujPrihlaseni();
  const d = prihlaskySchema.parse({
    registraceOtevrena: formData.get("registraceOtevrena") === "on",
    registraceSchvalovani: formData.get("registraceSchvalovani") === "on",
    ucet: formData.get("ucet"),
    startovne: formData.get("startovne"),
  });

  const stara = await db.query.akce.findFirst({
    where: eq(akce.id, id),
    columns: { slug: true },
  });

  await db
    .update(akce)
    .set({
      registraceOtevrena: d.registraceOtevrena,
      registraceSchvalovani: d.registraceSchvalovani,
      ucet: d.ucet ?? null,
      startovne: d.startovne ?? null,
    })
    .where(eq(akce.id, id));

  revalidatePath(`/admin/akce/${id}/nastaveni`);
  revalidatePath(`/admin/akce/${id}`);
  if (stara?.slug) revalidatePath(`/${stara.slug}`);
}

/** Nastaví/posune čas hromadného startu akce (měřicí obrazovka i ruční úprava). */
export async function nastavitStartAkce(id: string, casISO: string | null) {
  await vyzadujPrihlaseni();
  await db
    .update(akce)
    .set({ casStartu: casISO ? new Date(casISO) : null })
    .where(eq(akce.id, id));
  revalidatePath(`/admin/akce/${id}`);
}
