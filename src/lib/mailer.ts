import "server-only";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { webObsah } from "@/db/schema";

/**
 * Odesílání e-mailů přes SMTP (výchozí Office 365 / Microsoft 365).
 * Konfigurace se ukládá do `web_obsah` klíč `email` (viz server/email.ts).
 * Odesílání je best-effort — selhání nikdy neshodí volající akci.
 */

export const KLIC_EMAIL = "email";

export interface EmailKonfig {
  povoleno: boolean;
  host: string; // smtp.office365.com
  port: number; // 587 (STARTTLS)
  uzivatel: string; // přihlašovací e-mail schránky (SMTP AUTH)
  heslo: string; // heslo / app password
  odesilatel: string; // From (adresa, ze které se posílá)
  adminEmail: string; // kam chodí notifikace o nových registracích
}

/** Výchozí hodnoty laděné na Office 365 (Microsoft 365). */
export const VYCHOZI_EMAIL: EmailKonfig = {
  povoleno: false,
  host: "smtp.office365.com",
  port: 587,
  uzivatel: "",
  heslo: "",
  odesilatel: "",
  adminEmail: "",
};

/** Interní čtení konfigurace z DB (bez auth) — pro odesílání ze server akcí. */
export async function nactiEmailKonfigInterni(): Promise<EmailKonfig> {
  try {
    const row = await db.query.webObsah.findFirst({
      where: eq(webObsah.klic, KLIC_EMAIL),
    });
    return { ...VYCHOZI_EMAIL, ...((row?.data as Partial<EmailKonfig>) ?? {}) };
  } catch {
    return VYCHOZI_EMAIL;
  }
}

function transport(k: EmailKonfig) {
  return nodemailer.createTransport({
    host: k.host,
    port: k.port,
    secure: k.port === 465, // 465 = SSL, jinak STARTTLS (587)
    auth: k.uzivatel ? { user: k.uzivatel, pass: k.heslo } : undefined,
  });
}

export interface EmailZprava {
  komu: string;
  predmet: string;
  text: string;
  html?: string;
}

/**
 * Odešle e-mail. Vrací true při úspěchu, false když je mailer vypnutý,
 * nenakonfigurovaný, nebo odeslání selže (best-effort — nevyhazuje).
 */
export async function odeslatEmail(z: EmailZprava): Promise<boolean> {
  const k = await nactiEmailKonfigInterni();
  const from = k.odesilatel || k.uzivatel;
  if (!k.povoleno || !k.host || !from || !z.komu) return false;
  try {
    await transport(k).sendMail({
      from,
      to: z.komu,
      subject: z.predmet,
      text: z.text,
      html: z.html,
    });
    return true;
  } catch (e) {
    console.error("[mailer] odeslání selhalo:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Přímé odeslání s explicitní konfigurací (test z nastavení) — vyhazuje chybu. */
export async function odeslatTest(
  k: EmailKonfig,
  komu: string,
): Promise<void> {
  const from = k.odesilatel || k.uzivatel;
  if (!k.host || !from) throw new Error("Chybí SMTP host nebo odesílatel.");
  await transport(k).sendMail({
    from,
    to: komu,
    subject: "Časomír — testovací e-mail",
    text: "Toto je testovací zpráva. Pokud ji vidíte, SMTP funguje.",
  });
}
