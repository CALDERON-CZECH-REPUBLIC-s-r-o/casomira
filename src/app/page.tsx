import Link from "next/link";
import Image from "next/image";
import { Timer, Radio, FileText, type LucideIcon } from "lucide-react";
import { db } from "@/db/client";
import { BtnLink, Card, PoweredBy } from "@/app/admin/_components/ui";
import {
  VerejnyRozcestnik,
  type VerejnaAkce,
} from "./_verejny-rozcestnik";

// Data se mění během měření — vždy čerstvá, žádný statický prerender.
export const dynamic = "force-dynamic";

function Vlastnost({
  icon: Ikona,
  titul,
  popis,
}: {
  icon: LucideIcon;
  titul: string;
  popis: string;
}) {
  return (
    <Card className="p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-teal-50 text-teal-600">
        <Ikona size={20} strokeWidth={2} />
      </span>
      <div className="mt-3 font-semibold text-ink-900">{titul}</div>
      <p className="mt-1 text-sm text-ink-500">{popis}</p>
    </Card>
  );
}

/**
 * Veřejná úvodní stránka — landing Časomír: hero s logem, co appka umí, a níže
 * živý přehled závodů (startovky + výsledky). Detail akce žije na /{slug}.
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
    <main className="flex min-h-screen flex-col bg-ink-50">
      {/* Hero */}
      <section className="cal-dots border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center sm:py-16">
          <Image
            src="/casomir-teal.png"
            alt="Časomír — měření běžeckých závodů"
            width={580}
            height={435}
            priority
            className="mx-auto h-auto w-full max-w-[440px]"
          />
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-600">
            Měření běžeckých závodů od cíle po výsledky — offline v cíli, živě
            online.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <BtnLink href="#vysledky">Výsledky závodů</BtnLink>
            <BtnLink href="/admin" variant="ghost">
              Pro pořadatele →
            </BtnLink>
          </div>
        </div>
      </section>

      {/* Co to umí */}
      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          <Vlastnost
            icon={Timer}
            titul="Měření v cíli offline"
            popis="Klik = razítko. Běží lokálně na notebooku, nezávisle na síti; data se pojistí a synchronizují."
          />
          <Vlastnost
            icon={Radio}
            titul="Živé výsledky online"
            popis="Startovky i průběžné pořadí na veřejném webu — mobil, velkoplošná tabule, QR."
          />
          <Vlastnost
            icon={FileText}
            titul="Listiny a kategorie"
            popis="Import přihlášek, auto-zařazení do kategorií, startovní i výsledkové listiny do PDF a Excelu."
          />
        </div>
      </section>

      {/* Výsledky závodů */}
      <section id="vysledky" className="mx-auto w-full max-w-5xl px-6 pb-16">
        <h2 className="cal-eyebrow mb-4 text-teal-600">Výsledky závodů</h2>
        <VerejnyRozcestnik akce={data} />

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-6 text-sm text-ink-400">
          <Link href="/admin" className="hover:text-ink-600 hover:underline">
            Administrace
          </Link>
          <PoweredBy />
        </footer>
      </section>
    </main>
  );
}
