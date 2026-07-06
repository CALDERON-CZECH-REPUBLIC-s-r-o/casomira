import Link from "next/link";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { akce, zavodnik, cilovyZaznam } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { dokoncitOnboarding } from "@/server/onboarding";
import { PoweredBy } from "@/app/[locale]/admin/_components/ui";

export const dynamic = "force-dynamic";

export default async function VitejtePage() {
  await vyzadujPrihlaseni();

  const [pocetAkci, pocetZavodniku, pocetZaznamu, pocetPublik] =
    await Promise.all([
      db.$count(akce),
      db.$count(zavodnik),
      db.$count(cilovyZaznam),
      db.$count(akce, and(eq(akce.verejna, true), isNotNull(akce.casStartu))),
    ]);

  const kroky = [
    {
      hotovo: pocetAkci > 0,
      titul: "Založ první akci",
      popis: "Vytvoř závod — datum, místo, kategorie.",
      cta: { href: "/admin/akce/nova", label: "Založit akci" },
    },
    {
      hotovo: pocetZavodniku > 0,
      titul: "Importuj závodníky",
      popis: "Nahraj startovku nebo přidej závodníky ručně.",
      cta: { href: "/admin", label: "Importovat" },
    },
    {
      hotovo: pocetZaznamu > 0,
      titul: "Vyzkoušej měření",
      popis: "Zaznamenej první průchod cílem.",
      cta: { href: "/admin", label: "Vyzkoušet měření" },
    },
    {
      hotovo: pocetPublik > 0,
      titul: "Zveřejni výsledky",
      popis: "Spusť akci a zpřístupni veřejnou stránku.",
      cta: { href: "/admin", label: "Zveřejnit" },
    },
  ];

  const hotovych = kroky.filter((k) => k.hotovo).length;
  const aktualni = kroky.findIndex((k) => !k.hotovo);

  return (
    <main className="cal-dots-dark cal-glow-top flex min-h-screen items-center justify-center bg-ink-950 px-6 py-16 text-white">
      <div className="w-full max-w-lg">
        <div className="text-center">
          <div className="cal-eyebrow text-teal-300">Vítejte</div>
          <h1 className="mt-2 font-display text-3xl">
            Pojďme spustit první závod
          </h1>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-teal-400 transition-all"
              style={{ width: `${(hotovych / kroky.length) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-center font-technical text-[11px] uppercase tracking-[.08em] text-ink-300">
            {hotovych} / {kroky.length} hotovo
          </div>
        </div>

        {/* Checklist */}
        <ol className="mt-8 space-y-3">
          {kroky.map((k, i) => {
            const je = i === aktualni;
            return (
              <li
                key={k.titul}
                className={`flex items-start gap-4 rounded-[16px] border p-4 ${
                  je
                    ? "border-teal-400/60 bg-white/[.04]"
                    : "border-white/10 bg-white/[.02]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-semibold ${
                    k.hotovo
                      ? "bg-teal-500 text-white"
                      : je
                        ? "text-teal-300 ring-2 ring-teal-400"
                        : "border border-white/25 text-ink-300"
                  }`}
                >
                  {k.hotovo ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white">{k.titul}</div>
                  <div className="mt-0.5 text-sm text-ink-300">{k.popis}</div>
                  {!k.hotovo && (
                    <Link
                      href={k.cta.href}
                      className="mt-2 inline-block text-sm font-semibold text-teal-300 hover:underline"
                    >
                      {k.cta.label} →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Footer */}
        <form action={dokoncitOnboarding} className="mt-8 text-center">
          <button
            type="submit"
            className="text-sm font-medium text-ink-300 transition-colors hover:text-white"
          >
            Přeskočit a přejít do administrace →
          </button>
        </form>

        <div className="mt-10 flex justify-center">
          <PoweredBy variant="dark" />
        </div>
      </div>
    </main>
  );
}
