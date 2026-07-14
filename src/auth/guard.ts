import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT, uzivatel as uzivatelT } from "@/db/schema";
import type { Uzivatel } from "@/db/schema";
import type { Session } from "next-auth";
import { auth } from "./nextauth";

/**
 * Guard pro server akce a server komponenty administrace. Vrátí session,
 * nebo přesměruje na přihlášení. Proxy chrání /admin na úrovni routingu,
 * tohle chrání i přímé volání server akcí.
 */
export async function vyzadujPrihlaseni(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/prihlaseni");
  return session;
}

/**
 * Vrátí aktuálního uživatele z DB (role/stav autoritativně, ne ze staré JWT).
 * Přesměruje na přihlášení, když session chybí nebo účet už neexistuje.
 */
export async function nactiUzivatele(): Promise<{
  session: Session;
  uzivatel: Uzivatel;
}> {
  const session = await vyzadujPrihlaseni();
  const uzivatel = await db.query.uzivatel.findFirst({
    where: eq(uzivatelT.id, session.user.id),
  });
  if (!uzivatel) redirect("/prihlaseni");
  return { session, uzivatel };
}

/** Vyžaduje schválený účet. Neschválený (ceka/zamitnut) → obrazovka „čeká". */
export async function vyzadujSchvaleneho(): Promise<{
  session: Session;
  uzivatel: Uzivatel;
}> {
  const ctx = await nactiUzivatele();
  if (ctx.uzivatel.stav !== "schvalen") redirect("/admin/ceka");
  return ctx;
}

/** Vyžaduje globálního admina. Ostatní → 404 (panel se neprozradí). */
export async function vyzadujSuperAdmina(): Promise<{
  session: Session;
  uzivatel: Uzivatel;
}> {
  const ctx = await nactiUzivatele();
  if (ctx.uzivatel.role !== "superadmin") notFound();
  return ctx;
}

/**
 * Vyžaduje vlastnictví akce (tvrdá izolace). Vrátí akci; cizí/neexistující → 404.
 * Superadmin vidí vše. Používá se na začátku každé event stránky.
 */
export async function vyzadujAkci(akceId: string) {
  const { session, uzivatel } = await vyzadujSchvaleneho();
  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, akceId) });
  if (!akce) notFound();
  if (uzivatel.role !== "superadmin" && akce.uzivatelId !== uzivatel.id) {
    notFound();
  }
  return { session, uzivatel, akce };
}

/**
 * Boolean kontrola práva na akci (pro route handlery, které vrací Response
 * a nemohou použít `notFound()`/`redirect()`). Superadmin smí vše.
 */
export async function smiNaAkci(
  uzivatelId: string,
  akceId: string,
): Promise<boolean> {
  const [u, a] = await Promise.all([
    db.query.uzivatel.findFirst({
      where: eq(uzivatelT.id, uzivatelId),
      columns: { role: true },
    }),
    db.query.akce.findFirst({
      where: eq(akceT.id, akceId),
      columns: { uzivatelId: true },
    }),
  ]);
  if (!a) return false;
  return u?.role === "superadmin" || a.uzivatelId === uzivatelId;
}

/**
 * Tichá kontrola vlastnictví pro server akce (mutace). Cizí akce → 404.
 * Vrací aktuálního uživatele (pro případné další použití).
 */
export async function overitVlastnictviAkce(akceId: string): Promise<Uzivatel> {
  const { uzivatel } = await vyzadujSchvaleneho();
  const a = await db.query.akce.findFirst({
    where: eq(akceT.id, akceId),
    columns: { uzivatelId: true },
  });
  if (!a) notFound();
  if (uzivatel.role !== "superadmin" && a.uzivatelId !== uzivatel.id) {
    notFound();
  }
  return uzivatel;
}
