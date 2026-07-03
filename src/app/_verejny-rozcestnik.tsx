"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { Card, EmptyState, Pill } from "@/app/admin/_components/ui";

/**
 * Aktuální čas jako externí zdroj — na serveru i při hydrataci vrací null,
 * skutečnou hodnotu (cachovanou, aby se getSnapshot neměnil při každém renderu)
 * až v klientu po mountu. Tím se DOM nerozejde a Date.now() neběží při renderu.
 */
const clientNow = {
  subscribe: () => () => {},
  getSnapshot: (() => {
    let cached: number | null = null;
    return () => (cached ??= Date.now());
  })(),
  getServerSnapshot: () => null,
};

/**
 * Veřejný rozcestník (Calderon 2g) — klientská část domovské stránky.
 * Server (page.tsx) načte akce a předá je sem jako prostá serializovatelná data;
 * tady běží hledání a výpočet „proběhlo/živě" (potřebuje aktuální čas).
 */
export type VerejnaAkce = {
  id: string;
  nazev: string;
  datum: string;
  misto: string | null;
  slug: string;
  /** ISO string hromadného startu, nebo null dokud se nestartovalo. */
  casStartu: string | null;
};

function formatDatum(datum: string): string {
  const d = new Date(`${datum}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? datum
    : d.toLocaleDateString("cs-CZ", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      });
}

export function VerejnyRozcestnik({ akce }: { akce: VerejnaAkce[] }) {
  const [dotaz, setDotaz] = useState("");

  const filtrovane = useMemo(() => {
    const q = dotaz.trim().toLowerCase();
    if (!q) return akce;
    return akce.filter(
      (a) =>
        a.nazev.toLowerCase().includes(q) ||
        (a.misto ?? "").toLowerCase().includes(q),
    );
  }, [akce, dotaz]);

  const ted = useSyncExternalStore(
    clientNow.subscribe,
    clientNow.getSnapshot,
    clientNow.getServerSnapshot,
  );

  if (akce.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="h-7 w-7" strokeWidth={1.5} />}
        title="Zatím žádné zveřejněné akce"
        desc="Až organizátor zveřejní závod, objeví se tady i s živými výsledky."
      />
    );
  }

  return (
    <div>
      <input
        type="search"
        value={dotaz}
        onChange={(e) => setDotaz(e.target.value)}
        placeholder="Hledat akci podle názvu nebo místa…"
        aria-label="Hledat akci"
        className="cal-input mb-5"
      />

      {filtrovane.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-7 w-7" strokeWidth={1.5} />}
          title="Nic nenalezeno"
          desc="Zkuste upravit hledaný výraz."
        />
      ) : (
        <ul className="space-y-3">
          {filtrovane.map((a) => {
            const start = a.casStartu ? new Date(a.casStartu).getTime() : null;
            const jeStart = start !== null;
            const probehlo = start !== null && ted !== null && start < ted;

            return (
              <li key={a.id}>
                <Link href={`/${a.slug}`} className="block">
                  <Card
                    className={`rounded-[16px] p-4 transition-shadow ${
                      jeStart
                        ? "border-teal-300 shadow-[var(--shadow-sm)]"
                        : "shadow-[var(--shadow-xs)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-display text-lg font-bold text-ink-900">
                          {a.nazev}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
                          <span className="font-technical tabular-nums">
                            {formatDatum(a.datum)}
                          </span>
                          {a.misto && (
                            <>
                              <span className="text-ink-300">·</span>
                              <span>{a.misto}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {probehlo ? (
                        <Pill ton="ink">Dokončeno</Pill>
                      ) : jeStart ? (
                        <Pill ton="teal" dot>
                          Živě
                        </Pill>
                      ) : (
                        <Pill ton="info">Přihlášky</Pill>
                      )}
                    </div>

                    {jeStart && (
                      <div className="mt-3 text-sm font-semibold text-teal-600">
                        Výsledky →
                      </div>
                    )}
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
