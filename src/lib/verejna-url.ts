import "server-only";
import { env } from "@/lib/env";

/**
 * Veřejný původ (origin) instance pro absolutní odkazy a QR kódy. Přednostně
 * `APP_BASE_URL`, jinak cloud adresa `CLOUD_SYNC_URL`, jinak produkční doména.
 */
export function verejnyPuvod(): string {
  const raw = env.APP_BASE_URL ?? env.CLOUD_SYNC_URL ?? "https://casomir.cz";
  return raw.replace(/\/+$/, "");
}

/** Absolutní odkaz na veřejný profil akce, např. `https://casomir.cz/zernoseky`. */
export function verejnyOdkaz(slug: string): string {
  return `${verejnyPuvod()}/${slug}`;
}
