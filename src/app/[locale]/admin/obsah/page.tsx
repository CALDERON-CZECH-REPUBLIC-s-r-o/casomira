import Link from "next/link";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { nactiLandingObsah } from "@/server/obsah";
import { BackLink } from "../_components/ui";
import { ObsahForm } from "./obsah-form";

export const dynamic = "force-dynamic";

/**
 * Editace textů veřejné landing page (`/`) per jazyk (cs/en). Jazyk se volí přes
 * `?jazyk=`; formulář drží celý obsahový model a ukládá do `web_obsah`.
 */
export default async function ObsahPage({
  searchParams,
}: {
  searchParams: Promise<{ jazyk?: string }>;
}) {
  await vyzadujPrihlaseni();
  const { jazyk } = await searchParams;
  const locale = jazyk === "en" ? "en" : "cs";
  const obsah = await nactiLandingObsah(locale);

  const tabCls = (aktivni: boolean) =>
    `rounded-full px-3 py-1 font-technical text-[11px] font-semibold uppercase tracking-[.08em] transition-colors ${
      aktivni ? "bg-teal-500 text-white" : "bg-ink-100 text-ink-500 hover:text-ink-900"
    }`;

  return (
    <main className="min-h-screen bg-ink-50">
      <div className="cal-dots border-b border-ink-200 bg-[rgba(248,250,249,.92)]">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div className="mb-3">
            <BackLink href="/admin">Administrace</BackLink>
          </div>
          <div className="cal-eyebrow mb-1 text-teal-600">Obsah webu</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            Texty úvodní stránky
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Upravte texty marketingové landing page. Struktura, ikony a barvy
            zůstávají dle designu — měníte jen znění.
          </p>
          <div className="mt-4 inline-flex gap-1 rounded-full bg-white p-1 shadow-[var(--shadow-xs)]">
            <Link href="/admin/obsah" className={tabCls(locale === "cs")}>
              Čeština
            </Link>
            <Link href="/admin/obsah?jazyk=en" className={tabCls(locale === "en")}>
              English
            </Link>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-6 py-6">
        <ObsahForm key={locale} vychozi={obsah} locale={locale} />
      </section>
    </main>
  );
}
