import Link from "next/link";
import { db } from "@/db/client";
import { PoweredBy } from "@/app/admin/_components/ui";
import {
  VerejnyRozcestnik,
  type VerejnaAkce,
} from "./_verejny-rozcestnik";

// Data se mění během měření — vždy čerstvá, žádný statický prerender.
export const dynamic = "force-dynamic";

/**
 * Veřejná úvodní stránka (Calderon 2g „Veřejný rozcestník"). Server jen načte
 * akce a předá je klientskému rozcestníku (hledání + výpočet „živě"/„proběhlo"
 * potřebuje aktuální čas, proto běží v klientu). Detail akce žije na /{slug}.
 */
export default async function HomePage() {
  const akce = await db.query.akce.findMany({
    orderBy: (a, { desc }) => [desc(a.datum)],
  });

  const data: VerejnaAkce[] = akce.map((a) => ({
    id: a.id,
    nazev: a.nazev,
    datum: a.datum,
    misto: a.misto,
    slug: a.slug,
    casStartu: a.casStartu ? a.casStartu.toISOString() : null,
  }));

  return (
    <main className="min-h-screen bg-ink-50">
      <section className="cal-dots-dark cal-glow-top bg-ink-950">
        <div className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-20 lg:max-w-5xl">
          <div className="cal-eyebrow text-teal-300">Časomíra</div>
          <h1 className="mt-3 font-display text-4xl font-bold text-white">
            Výsledky závodů, živě
          </h1>
          <p className="mt-3 text-ink-300">
            Startovní listiny i průběžné výsledky závodů na jednom místě.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-2xl p-6 lg:max-w-5xl">
        <VerejnyRozcestnik akce={data} />

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-400">
          <Link href="/admin" className="hover:text-ink-600 hover:underline">
            Administrace
          </Link>
          <PoweredBy />
        </footer>
      </div>
    </main>
  );
}
