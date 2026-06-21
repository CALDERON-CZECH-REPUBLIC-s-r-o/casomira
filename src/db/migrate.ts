import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Release-step migrátor. Spouští se před startem aplikace (Coolify) i v devu (`npm run db:migrate`).
 * PG advisory lock zabraňuje souběhu.
 */
const LOCK_KEY = 4242;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL není nastavená");

  // onnotice ztlumí neškodné NOTICE (např. „… already exists, skipping“).
  const client = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(client);

  try {
    await client`SELECT pg_advisory_lock(${LOCK_KEY})`;
    console.log("[migrate] spouštím migrace…");
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("[migrate] hotovo.");
  } finally {
    await client`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    await client.end();
  }
}

main().catch((err) => {
  console.error("[migrate] chyba:", err);
  process.exit(1);
});
