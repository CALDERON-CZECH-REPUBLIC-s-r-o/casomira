import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import * as schema from "./schema";

/**
 * Založí/přenastaví organizátorský účet (idempotentní upsert dle e-mailu).
 * Sdílené jádro pro `create-admin` (ruční) i `bootstrap-admin` (deploy z env).
 */
export async function nastavAdmin(
  emailRaw: string,
  password: string,
): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) throw new Error("Chybí e-mail nebo heslo.");
  if (password.length < 8) throw new Error("Heslo musí mít alespoň 8 znaků.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL není nastavená.");

  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });
  try {
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
  } finally {
    await client.end();
  }
}
