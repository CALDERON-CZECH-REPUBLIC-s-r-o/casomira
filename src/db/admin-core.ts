import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { hashHesla, MIN_DELKA_HESLA } from "../lib/hesla";

/**
 * Založí/přenastaví pořadatelský účet (idempotentní upsert dle e-mailu).
 * Sdílené jádro pro `create-admin` (ruční) i `bootstrap-admin` (deploy z env).
 * CLI účty jsou důvěryhodné → rovnou `stav='schvalen'`. `superadmin=true` udělí
 * roli globálního admina (panel zákazníků/fakturace).
 */
export async function nastavAdmin(
  emailRaw: string,
  password: string,
  opts: { superadmin?: boolean } = {},
): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) throw new Error("Chybí e-mail nebo heslo.");
  if (password.length < MIN_DELKA_HESLA)
    throw new Error(`Heslo musí mít alespoň ${MIN_DELKA_HESLA} znaků.`);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL není nastavená.");

  const role = opts.superadmin ? "superadmin" : "organizator";
  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });
  try {
    const heshHesla = await hashHesla(password);
    await db
      .insert(schema.uzivatel)
      .values({
        email,
        jmeno: "Organizátor",
        heshHesla,
        role,
        stav: "schvalen",
      })
      .onConflictDoUpdate({
        target: schema.uzivatel.email,
        set: { heshHesla, role, stav: "schvalen" },
      });
  } finally {
    await client.end();
  }
}
