import "dotenv/config";
import { nastavAdmin } from "./admin-core";

/**
 * Deploy bootstrap admina — spouští se po migracích (viz docker-compose `migrate`).
 * Když ADMIN_EMAIL/ADMIN_PASSWORD NEJSOU nastavené, tiše přeskočí (exit 0), aby
 * deploy nespadl; org účet pak založíš ručně přes `npm run create-admin`.
 * Idempotentní: existující účet jen přenastaví heslo (bez ohledu na restarty).
 */
async function main() {
  const email = process.env.ADMIN_EMAIL ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !password) {
    console.log(
      "[bootstrap-admin] ADMIN_EMAIL/ADMIN_PASSWORD nenastaveny → přeskočeno.",
    );
    return;
  }
  await nastavAdmin(email, password);
  console.log(`[bootstrap-admin] org účet připraven: ${email.trim().toLowerCase()}`);
}

main().catch((e) => {
  console.error("[bootstrap-admin] chyba:", e);
  process.exit(1);
});
