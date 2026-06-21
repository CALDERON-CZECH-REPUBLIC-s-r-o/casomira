import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Dev seed — jedna ukázková akce s kategoriemi a pár závodníky.
 * Spustit: `npm run db:seed` (smaže a znovu naplní ukázková data).
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL není nastavená");
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  console.log("[seed] mažu ukázkovou akci…");
  await db
    .delete(schema.akce)
    .where(eq(schema.akce.slug, "ukazkovy-beh-2026"));

  console.log("[seed] vytvářím akci…");
  const [akce] = await db
    .insert(schema.akce)
    .values({
      nazev: "Ukázkový běh Ústí 2026",
      datum: "2026-06-21",
      misto: "Ústí nad Labem",
      rok: 2026,
      slug: "ukazkovy-beh-2026",
      poznamka: "Seed data pro vývoj.",
    })
    .returning();

  console.log("[seed] vytvářím kategorie (věkové, dle vzoru)…");
  const kategorie = await db
    .insert(schema.kategorie)
    .values([
      { akceId: akce.id, nazev: "Muži do 40 let", kod: "M40", pohlavi: "M", vekDo: 40, poradi: 1 },
      { akceId: akce.id, nazev: "Muži do 95 let", kod: "M95", pohlavi: "M", vekOd: 41, vekDo: 95, poradi: 2 },
      { akceId: akce.id, nazev: "Ženy do 40 let", kod: "Z40", pohlavi: "Z", vekDo: 40, poradi: 3 },
      { akceId: akce.id, nazev: "Ženy do 95 let", kod: "Z95", pohlavi: "Z", vekOd: 41, vekDo: 95, poradi: 4 },
    ])
    .returning();

  const muzi = kategorie.find((k) => k.kod === "M40")!;
  const zeny = kategorie.find((k) => k.kod === "Z40")!;

  console.log("[seed] vytvářím závodníky…");
  await db.insert(schema.zavodnik).values([
    {
      akceId: akce.id,
      jmeno: "Jan",
      prijmeni: "Novák",
      rokNarozeni: 1990,
      pohlavi: "M",
      startovniCislo: 1,
      mesto: "Litoměřice",
      kategorieId: muzi.id,
    },
    {
      akceId: akce.id,
      jmeno: "Petr",
      prijmeni: "Svoboda",
      rokNarozeni: 1978,
      pohlavi: "M",
      startovniCislo: 2,
      mesto: "Děčín",
      kategorieId: kategorie.find((k) => k.kod === "M95")!.id,
    },
    {
      akceId: akce.id,
      jmeno: "Eva",
      prijmeni: "Dvořáková",
      rokNarozeni: 1995,
      pohlavi: "Z",
      startovniCislo: 3,
      mesto: "Ústí nad Labem",
      kategorieId: zeny.id,
    },
  ]);

  console.log("[seed] hotovo. Akce:", akce.slug);
  await client.end();
}

main().catch((err) => {
  console.error("[seed] chyba:", err);
  process.exit(1);
});
