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

  console.log("[seed] vytvářím kategorie…");
  const kategorie = await db
    .insert(schema.kategorie)
    .values([
      { akceId: akce.id, nazev: "Muži", pohlavi: "M", poradi: 1 },
      { akceId: akce.id, nazev: "Ženy", pohlavi: "Z", poradi: 2 },
      {
        akceId: akce.id,
        nazev: "Žáci (2012–2015)",
        pohlavi: "M",
        rokNarozeniOd: 2012,
        rokNarozeniDo: 2015,
        poradi: 3,
      },
    ])
    .returning();

  const muzi = kategorie.find((k) => k.nazev === "Muži")!;
  const zeny = kategorie.find((k) => k.nazev === "Ženy")!;

  console.log("[seed] vytvářím závodníky…");
  await db.insert(schema.zavodnik).values([
    {
      akceId: akce.id,
      jmeno: "Jan",
      prijmeni: "Novák",
      rokNarozeni: 1990,
      pohlavi: "M",
      startovniCislo: 1,
      oddil: "SK Ústí",
      kategorieId: muzi.id,
    },
    {
      akceId: akce.id,
      jmeno: "Petr",
      prijmeni: "Svoboda",
      rokNarozeni: 1985,
      pohlavi: "M",
      startovniCislo: 2,
      oddil: "AC Děčín",
      kategorieId: muzi.id,
    },
    {
      akceId: akce.id,
      jmeno: "Eva",
      prijmeni: "Dvořáková",
      rokNarozeni: 1995,
      pohlavi: "Z",
      startovniCislo: 3,
      oddil: "SK Ústí",
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
