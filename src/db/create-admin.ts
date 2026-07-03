import "dotenv/config";
import { nastavAdmin } from "./admin-core";

/**
 * Bootstrap organizátorského účtu (ruční).
 * Použití:  ADMIN_EMAIL=org@akce.cz ADMIN_PASSWORD=… npm run create-admin
 * nebo:     npm run create-admin -- org@akce.cz tajneheslo
 * Idempotentní: existující e-mail jen přenastaví heslo.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL ?? process.argv[2] ?? "";
  const password = process.env.ADMIN_PASSWORD ?? process.argv[3] ?? "";
  if (!email || !password) {
    console.error(
      "Použití: ADMIN_EMAIL=org@akce.cz ADMIN_PASSWORD=… npm run create-admin",
    );
    process.exit(1);
  }
  await nastavAdmin(email, password);
  console.log(`[create-admin] hotovo: ${email.trim().toLowerCase()}`);
}

main().catch((e) => {
  console.error("[create-admin] chyba:", e);
  process.exit(1);
});
