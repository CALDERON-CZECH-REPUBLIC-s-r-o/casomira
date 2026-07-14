"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { uzivatel as uzivatelT } from "@/db/schema";
import { vyzadujSuperAdmina } from "@/auth/guard";
import { hashHesla, MIN_DELKA_HESLA } from "@/lib/hesla";
import { klientskaIp, pod_limitem } from "@/lib/rate-limit";
import { overitTurnstile, turnstileZapnuto } from "@/lib/turnstile";
import { odeslatEmail, nactiEmailKonfigInterni } from "@/lib/mailer";
import { verejnyPuvod } from "@/lib/verejna-url";

/* ---------- Veřejná registrace pořadatele ---------- */

const registraceSchema = z.object({
  jmeno: z.string().trim().min(2, "Zadejte jméno.").max(120),
  email: z.string().trim().toLowerCase().email("Neplatný e-mail.").max(160),
  heslo: z
    .string()
    .min(MIN_DELKA_HESLA, `Heslo musí mít alespoň ${MIN_DELKA_HESLA} znaků.`)
    .max(200),
  firma: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(160).optional(),
  ),
  ico: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(20).optional(),
  ),
  dic: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(20).optional(),
  ),
  telefon: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(40).optional(),
  ),
});

export type RegistraceState =
  | { stav: "idle" }
  | { stav: "chyba"; zprava: string }
  | { stav: "ok" };

/**
 * Veřejná registrace pořadatele (bez přihlášení). Založí účet ve stavu `ceka`
 * — globální admin ho schválí. Honeypot + časová past + rate-limit + Turnstile.
 */
export async function registrovatOrganizatora(
  _prev: RegistraceState,
  formData: FormData,
): Promise<RegistraceState> {
  // 1) Honeypot: skryté pole `web` vyplní jen bot.
  if ((formData.get("web") as string)?.trim()) return { stav: "ok" };

  // 2) Časová past: odesláno do 3 s od otevření = bot.
  const ts = Number(formData.get("ts"));
  if (!Number.isFinite(ts) || Date.now() - ts < 3000) return { stav: "ok" };

  // 3) Rate-limit dle IP (3 registrace / hodinu).
  const ip = await klientskaIp();
  if (!pod_limitem(`registrace:${ip}`, 3, 60 * 60 * 1000)) {
    return {
      stav: "chyba",
      zprava: "Příliš mnoho pokusů. Zkuste to prosím za chvíli.",
    };
  }

  // 4) Cloudflare Turnstile (jen když je nakonfigurováno).
  if (turnstileZapnuto()) {
    const ok = await overitTurnstile(
      formData.get("cf-turnstile-response") as string | null,
      ip,
    );
    if (!ok) {
      return {
        stav: "chyba",
        zprava: "Ověření se nezdařilo. Zkuste to prosím znovu.",
      };
    }
  }

  const parsed = registraceSchema.safeParse({
    jmeno: formData.get("jmeno"),
    email: formData.get("email"),
    heslo: formData.get("heslo"),
    firma: formData.get("firma"),
    ico: formData.get("ico"),
    dic: formData.get("dic"),
    telefon: formData.get("telefon"),
  });
  if (!parsed.success) {
    return {
      stav: "chyba",
      zprava: parsed.error.issues[0]?.message ?? "Zkontrolujte údaje.",
    };
  }
  const d = parsed.data;

  const existuje = await db.query.uzivatel.findFirst({
    where: eq(uzivatelT.email, d.email),
    columns: { id: true },
  });
  if (existuje) {
    return { stav: "chyba", zprava: "Tento e-mail už je registrovaný." };
  }

  const heshHesla = await hashHesla(d.heslo);
  await db.insert(uzivatelT).values({
    email: d.email,
    jmeno: d.jmeno,
    heshHesla,
    role: "organizator",
    stav: "ceka",
    firma: d.firma ?? null,
    ico: d.ico ?? null,
    dic: d.dic ?? null,
    telefon: d.telefon ?? null,
  });

  // Notifikace administrátorovi o nové registraci (best-effort).
  const konfig = await nactiEmailKonfigInterni();
  if (konfig.adminEmail) {
    await odeslatEmail({
      komu: konfig.adminEmail,
      predmet: "Časomír — nová registrace pořadatele",
      text:
        `Nová registrace pořadatele čeká na schválení:\n\n` +
        `Jméno: ${d.jmeno}\nE-mail: ${d.email}\n` +
        `${d.firma ? `Firma: ${d.firma}\n` : ""}` +
        `${d.ico ? `IČO: ${d.ico}\n` : ""}` +
        `\nSchválit: ${verejnyPuvod()}/admin/zakaznici`,
    });
  }

  revalidatePath("/admin/zakaznici");
  return { stav: "ok" };
}

/* ---------- Schvalování (globální admin) ---------- */

/** Schválí pořadatele — smí se přihlásit a zakládat akce. */
export async function schvalitOrganizatora(id: string): Promise<void> {
  await vyzadujSuperAdmina();
  const u = await db.query.uzivatel.findFirst({
    where: eq(uzivatelT.id, id),
    columns: { email: true, jmeno: true },
  });
  await db
    .update(uzivatelT)
    .set({ stav: "schvalen", schvalenoAt: new Date() })
    .where(eq(uzivatelT.id, id));
  if (u) {
    await odeslatEmail({
      komu: u.email,
      predmet: "Časomír — účet schválen",
      text:
        `Dobrý den${u.jmeno ? ` ${u.jmeno}` : ""},\n\n` +
        `váš pořadatelský účet byl schválen. Přihlaste se na ` +
        `${verejnyPuvod()}/prihlaseni a můžete zakládat a měřit závody.\n\n` +
        `Časomír`,
    });
  }
  revalidatePath("/admin/zakaznici");
}

/** Zamítne pořadatele — nepustí se do administrace. */
export async function zamitnoutOrganizatora(id: string): Promise<void> {
  await vyzadujSuperAdmina();
  const u = await db.query.uzivatel.findFirst({
    where: eq(uzivatelT.id, id),
    columns: { email: true, jmeno: true },
  });
  await db
    .update(uzivatelT)
    .set({ stav: "zamitnut" })
    .where(eq(uzivatelT.id, id));
  if (u) {
    await odeslatEmail({
      komu: u.email,
      predmet: "Časomír — registrace zamítnuta",
      text:
        `Dobrý den${u.jmeno ? ` ${u.jmeno}` : ""},\n\n` +
        `vaše registrace pořadatelského účtu bohužel nebyla schválena. ` +
        `V případě dotazů nás kontaktujte.\n\nČasomír`,
    });
  }
  revalidatePath("/admin/zakaznici");
}
