"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { akce as akceT, kategorie as katT, zavodnik as zavT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { zaradit } from "@/domain/zarazeni";
import { odhadniPohlaviZeJmena, type Pohlavi } from "@/lib/pohlavi";
import { prepocitatZarazeni } from "./kategorie";

const cisloNeboNull = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().optional(),
);
const textNeboNull = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().trim().optional(),
);

const zavodnikSchema = z.object({
  jmeno: z.string().trim().default(""),
  prijmeni: z.string().trim().min(1, "Příjmení je povinné"),
  rokNarozeni: cisloNeboNull,
  pohlavi: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.enum(["M", "Z"]).optional(),
  ),
  startovniCislo: cisloNeboNull,
  oddil: textNeboNull,
  mesto: textNeboNull,
});

function parseForm(fd: FormData) {
  return zavodnikSchema.parse({
    jmeno: fd.get("jmeno"),
    prijmeni: fd.get("prijmeni"),
    rokNarozeni: fd.get("rokNarozeni"),
    pohlavi: fd.get("pohlavi"),
    startovniCislo: fd.get("startovniCislo"),
    oddil: fd.get("oddil"),
    mesto: fd.get("mesto"),
  });
}

/** Zařadí jednoho závodníka podle aktuálních kategorií akce (nebo null). */
async function zaraditJednoho(
  akceId: string,
  z: { pohlavi: Pohlavi | null; rokNarozeni: number | null },
): Promise<string | null> {
  const ak = await db.query.akce.findFirst({
    where: eq(akceT.id, akceId),
    columns: { rok: true },
  });
  if (!ak) return null;
  const kategorie = await db.query.kategorie.findMany({
    where: eq(katT.akceId, akceId),
  });
  return zaradit({ pohlavi: z.pohlavi, rokNarozeni: z.rokNarozeni }, kategorie, ak.rok);
}

/** Ověří, že startovní číslo v akci ještě není obsazené (kromě `krome` id). */
async function cisloVolne(
  akceId: string,
  cislo: number,
  krome?: string,
): Promise<boolean> {
  const existuje = await db.query.zavodnik.findFirst({
    where: and(eq(zavT.akceId, akceId), eq(zavT.startovniCislo, cislo)),
    columns: { id: true },
  });
  return !existuje || existuje.id === krome;
}

export async function vytvoritZavodnika(akceId: string, formData: FormData) {
  await vyzadujPrihlaseni();
  const d = parseForm(formData);
  if (d.startovniCislo != null && !(await cisloVolne(akceId, d.startovniCislo))) {
    throw new Error(`Startovní číslo ${d.startovniCislo} už v akci existuje.`);
  }
  const pohlavi = d.pohlavi ?? null;
  const rokNarozeni = d.rokNarozeni ?? null;
  const kategorieId = await zaraditJednoho(akceId, { pohlavi, rokNarozeni });
  await db.insert(zavT).values({
    akceId,
    jmeno: d.jmeno,
    prijmeni: d.prijmeni,
    rokNarozeni,
    pohlavi,
    startovniCislo: d.startovniCislo ?? null,
    oddil: d.oddil ?? null,
    mesto: d.mesto ?? null,
    kategorieId,
  });
  revalidatePath(`/admin/akce/${akceId}/zavodnici`);
  revalidatePath(`/admin/akce/${akceId}`);
}

export async function upravitZavodnika(
  zavodnikId: string,
  akceId: string,
  formData: FormData,
) {
  await vyzadujPrihlaseni();
  const d = parseForm(formData);
  if (
    d.startovniCislo != null &&
    !(await cisloVolne(akceId, d.startovniCislo, zavodnikId))
  ) {
    throw new Error(`Startovní číslo ${d.startovniCislo} už v akci existuje.`);
  }
  const pohlavi = d.pohlavi ?? null;
  const rokNarozeni = d.rokNarozeni ?? null;
  const kategorieId = await zaraditJednoho(akceId, { pohlavi, rokNarozeni });
  await db
    .update(zavT)
    .set({
      jmeno: d.jmeno,
      prijmeni: d.prijmeni,
      rokNarozeni,
      pohlavi,
      startovniCislo: d.startovniCislo ?? null,
      oddil: d.oddil ?? null,
      mesto: d.mesto ?? null,
      kategorieId,
    })
    .where(eq(zavT.id, zavodnikId));
  revalidatePath(`/admin/akce/${akceId}/zavodnici`);
  revalidatePath(`/admin/akce/${akceId}`);
}

/** Ruční nastavení pohlaví u jednoho závodníka + přepočet jeho zařazení. */
export async function nastavitPohlavi(
  zavodnikId: string,
  akceId: string,
  pohlavi: Pohlavi,
) {
  await vyzadujPrihlaseni();
  const z = await db.query.zavodnik.findFirst({
    where: eq(zavT.id, zavodnikId),
    columns: { rokNarozeni: true },
  });
  const kategorieId = await zaraditJednoho(akceId, {
    pohlavi,
    rokNarozeni: z?.rokNarozeni ?? null,
  });
  await db
    .update(zavT)
    .set({ pohlavi, kategorieId })
    .where(eq(zavT.id, zavodnikId));
  revalidatePath(`/admin/akce/${akceId}/zavodnici`);
  revalidatePath(`/admin/akce/${akceId}`);
}

/**
 * Doplní chybějící pohlaví u všech závodníků akce heuristikou dle jména
 * a příjmení, pak přepočítá zařazení do kategorií. Vrací počet doplněných.
 */
export async function doplnitPohlaviDleJmen(
  akceId: string,
): Promise<{ doplneno: number }> {
  await vyzadujPrihlaseni();
  const bezPohlavi = await db.query.zavodnik.findMany({
    where: and(eq(zavT.akceId, akceId), isNull(zavT.pohlavi)),
    columns: { id: true, jmeno: true, prijmeni: true },
  });
  let doplneno = 0;
  for (const z of bezPohlavi) {
    const p = odhadniPohlaviZeJmena(z.jmeno, z.prijmeni);
    if (p) {
      await db.update(zavT).set({ pohlavi: p }).where(eq(zavT.id, z.id));
      doplneno += 1;
    }
  }
  if (doplneno > 0) await prepocitatZarazeni(akceId);
  revalidatePath(`/admin/akce/${akceId}/zavodnici`);
  revalidatePath(`/admin/akce/${akceId}`);
  return { doplneno };
}
