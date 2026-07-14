import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, isNull } from "drizzle-orm";
import * as schema from "./schema";

/**
 * Povýší existující účet na globálního admina a převezme „osiřelé" akce
 * (bez vlastníka) pod něj. Použití:
 *   EMAIL=api@calderon.cz npm run promote-superadmin
 * (nebo `npm run promote-superadmin -- api@calderon.cz`)
 */
async function main() {
  const email = (process.env.EMAIL ?? process.argv[2] ?? "").trim().toLowerCase();
  if (!email) throw new Error("Zadej EMAIL=… (nebo argument).");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL není nastavená.");

  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });
  try {
    const u = await db.query.uzivatel.findFirst({
      where: eq(schema.uzivatel.email, email),
    });
    if (!u) throw new Error(`Účet ${email} neexistuje (nejdřív create-admin).`);

    await db
      .update(schema.uzivatel)
      .set({ role: "superadmin", stav: "schvalen", schvalenoAt: new Date() })
      .where(eq(schema.uzivatel.id, u.id));

    // Osiřelé akce (bez vlastníka) přiřadit tomuto účtu.
    const prevzate = await db
      .update(schema.akce)
      .set({ uzivatelId: u.id })
      .where(isNull(schema.akce.uzivatelId))
      .returning({ id: schema.akce.id });

    console.log(
      `[promote] ${email} → superadmin; převzato akcí bez vlastníka: ${prevzate.length}`,
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
