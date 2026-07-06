import "server-only";
import { env } from "@/lib/env";

/**
 * Cloudflare Turnstile — nenápadná CAPTCHA pro veřejný přihlašovací formulář.
 * Aktivní jen když jsou nastavené klíče (jinak se přeskočí → jede lehká ochrana).
 * Site key je veřejný (jde do klienta), secret zůstává na serveru.
 */
export function turnstileSiteKey(): string | null {
  return env.TURNSTILE_SITE_KEY ?? null;
}

export function turnstileZapnuto(): boolean {
  return !!(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET);
}

/** Ověří Turnstile token proti Cloudflare. Bez secretu vrací true (přeskočeno). */
export async function overitTurnstile(
  token: string | null,
  ip?: string,
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true; // nezapnuto → neblokuj
  if (!token) return false;
  try {
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
    });
    if (ip && ip !== "neznama") body.set("remoteip", ip);
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    const data = (await r.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false; // při chybě ověření raději odmítni
  }
}
