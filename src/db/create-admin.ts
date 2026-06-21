import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import * as schema from "./schema";

/**
 * Bootstrap organizátorského účtu.
 * Použití:  ADMIN_EMAIL=org@akce.cz ADMIN_PASSWORD=… npm run create-admin
 * nebo:     npm run create-admin -- org@akce.cz tajneheslo
 * Idempotentní: existující e-mail jen přenastaví heslo.
 */
async function main() {
  const email = (process.env.ADMIN_EMAIL ?? process.argv[2] ?? "")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? process.argv[3] ?? "";
  if (!email || !password) {
    console.error(
      "Použití: ADMIN_EMAIL=org@akce.cz ADMIN_PASSWORD=… npm run create-admin",
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Heslo musí mít alespoň 8 znaků.");
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });
  const heshHesla = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await db
    .insert(schema.uzivatel)
    .values({ email, jmeno: "Organizátor", heshHesla })
    .onConflictDoUpdate({
      target: schema.uzivatel.email,
      set: { heshHesla },
    });

  console.log(`[create-admin] hotovo: ${email}`);
  await client.end();
}

main().catch((e) => {
  console.error("[create-admin] chyba:", e);
  process.exit(1);
});
