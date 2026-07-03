"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { akce, kategorie, zavodnik } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { zaradit } from "@/domain/zarazeni";

const cisloNeboNull = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().optional(),
);

const kategorieSchema = z.object({
  nazev: z.string().trim().min(1, "Název je povinný"),
  kod: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().optional(),
  ),
  pohlavi: z.enum(["M", "Z", "smisene"]),
  rokNarozeniOd: cisloNeboNull,
  rokNarozeniDo: cisloNeboNull,
  vekOd: cisloNeboNull,
  vekDo: cisloNeboNull,
  poradi: cisloNeboNull,
});

function parseForm(formData: FormData) {
  return kategorieSchema.parse({
    nazev: formData.get("nazev"),
    kod: formData.get("kod"),
    pohlavi: formData.get("pohlavi"),
    rokNarozeniOd: formData.get("rokNarozeniOd"),
    rokNarozeniDo: formData.get("rokNarozeniDo"),
    vekOd: formData.get("vekOd"),
    vekDo: formData.get("vekDo"),
    poradi: formData.get("poradi"),
  });
}

export async function vytvoritKategorii(akceId: string, formData: FormData) {
  await vyzadujPrihlaseni();
  const d = parseForm(formData);
  await db.insert(kategorie).values({
    akceId,
    nazev: d.nazev,
    kod: d.kod ?? null,
    pohlavi: d.pohlavi,
    rokNarozeniOd: d.rokNarozeniOd ?? null,
    rokNarozeniDo: d.rokNarozeniDo ?? null,
    vekOd: d.vekOd ?? null,
    vekDo: d.vekDo ?? null,
    poradi: d.poradi ?? 0,
  });
  revalidatePath(`/admin/akce/${akceId}/kategorie`);
}

const hromadneSchema = z.array(
  z.object({
    nazev: z.string().trim().min(1),
    kod: z.string().trim().nullable(),
    pohlavi: z.enum(["M", "Z", "smisene"]),
    vekOd: z.number().int().nullable(),
    vekDo: z.number().int().nullable(),
    rokNarozeniOd: z.number().int().nullable(),
    rokNarozeniDo: z.number().int().nullable(),
  }),
);

/**
 * Hromadné vytvoření kategorií (průvodce). Připojí za stávající (offset pořadí)
 * a přepočítá zařazení závodníků. Vrací počet vytvořených.
 */
export async function vytvoritKategorieHromadne(
  akceId: string,
  vstup: unknown,
): Promise<{ vytvoreno: number }> {
  await vyzadujPrihlaseni();
  const parsed = hromadneSchema.safeParse(vstup);
  if (!parsed.success || parsed.data.length === 0) return { vytvoreno: 0 };

  const existujici = await db.query.kategorie.findMany({
    where: eq(kategorie.akceId, akceId),
    columns: { poradi: true },
  });
  const offset = existujici.reduce((m, k) => Math.max(m, k.poradi), 0);

  await db.insert(kategorie).values(
    parsed.data.map((k, i) => ({
      akceId,
      nazev: k.nazev,
      kod: k.kod,
      pohlavi: k.pohlavi,
      vekOd: k.vekOd,
      vekDo: k.vekDo,
      rokNarozeniOd: k.rokNarozeniOd,
      rokNarozeniDo: k.rokNarozeniDo,
      poradi: offset + i + 1,
    })),
  );

  await prepocitatZarazeni(akceId);
  revalidatePath(`/admin/akce/${akceId}/kategorie`);
  revalidatePath(`/admin/akce/${akceId}`);
  return { vytvoreno: parsed.data.length };
}

export async function upravitKategorii(
  id: string,
  akceId: string,
  formData: FormData,
) {
  await vyzadujPrihlaseni();
  const d = parseForm(formData);
  await db
    .update(kategorie)
    .set({
      nazev: d.nazev,
      kod: d.kod ?? null,
      pohlavi: d.pohlavi,
      rokNarozeniOd: d.rokNarozeniOd ?? null,
      rokNarozeniDo: d.rokNarozeniDo ?? null,
      vekOd: d.vekOd ?? null,
      vekDo: d.vekDo ?? null,
      poradi: d.poradi ?? 0,
    })
    .where(eq(kategorie.id, id));
  revalidatePath(`/admin/akce/${akceId}/kategorie`);
}

export async function smazatKategorii(id: string, akceId: string) {
  await vyzadujPrihlaseni();
  // FK má onDelete: set null → závodníci zůstanou bez kategorie (k řešení).
  await db.delete(kategorie).where(eq(kategorie.id, id));
  revalidatePath(`/admin/akce/${akceId}/kategorie`);
}

/**
 * Znovu rozřadí všechny závodníky akce dle aktuálních pravidel kategorií.
 * Vrací počet změněných a počet nezařazených (k řešení).
 */
export async function prepocitatZarazeni(
  akceId: string,
): Promise<{ zmeneno: number; nezarazeno: number }> {
  await vyzadujPrihlaseni();

  const ak = await db.query.akce.findFirst({
    where: eq(akce.id, akceId),
    columns: { rok: true },
  });
  if (!ak) return { zmeneno: 0, nezarazeno: 0 };

  const kategorie_ = await db.query.kategorie.findMany({
    where: eq(kategorie.akceId, akceId),
  });
  const zavodnici = await db.query.zavodnik.findMany({
    where: eq(zavodnik.akceId, akceId),
  });

  let zmeneno = 0;
  let nezarazeno = 0;

  for (const z of zavodnici) {
    const nova = zaradit(
      { pohlavi: z.pohlavi, rokNarozeni: z.rokNarozeni },
      kategorie_,
      ak.rok,
    );
    if (nova === null) nezarazeno += 1;
    if (nova !== z.kategorieId) {
      await db
        .update(zavodnik)
        .set({ kategorieId: nova })
        .where(eq(zavodnik.id, z.id));
      zmeneno += 1;
    }
  }

  revalidatePath(`/admin/akce/${akceId}/kategorie`);
  revalidatePath(`/admin/akce/${akceId}`);
  return { zmeneno, nezarazeno };
}
