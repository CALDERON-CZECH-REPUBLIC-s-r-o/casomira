import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  akce as akceT,
  cilovyZaznam,
  kategorie as kategorieT,
  mericiBod,
  zavodnik as zavT,
} from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { cistyCas } from "@/lib/cas";
import {
  splityZavodnika,
  formatTempo,
  type MericiBodDomain,
  type SplitZaznam,
} from "@/domain/splity";
import { MedalCircle, PoweredBy } from "@/app/[locale]/admin/_components/ui";
import { Refresh } from "./refresh";

/**
 * MODERÁTORSKÁ / hlásicí obrazovka (design 14a) — pouze čtení, neměří.
 * Tmavý fokus pohled bez chrome (žádný SpravaShell/sidebar). Ukazuje, kdo je
 * NA ŘADĚ, kdo se BLÍŽÍ SE (z průběžných bran) a kdo PRÁVĚ DOBĚHL. Refresh
 * (klient) každých 5 s přetáhne čerstvá data.
 */
export const dynamic = "force-dynamic";

function ms(d: Date | string): number {
  return typeof d === "string" ? new Date(d).getTime() : d.getTime();
}

/** Hrubý ETA/split formát „m:ss" z milisekund. */
function mss(millis: number): string {
  if (millis < 0) millis = 0;
  const s = Math.round(millis / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

interface Featured {
  jmeno: string;
  klub: string;
  kategorie: string;
  cislo: number | null;
  // pro blížící se
  lastSplit?: string;
  tempo?: string;
  eta?: string;
  // pro doběhnuvší (fallback featured)
  cas?: string;
  poradi?: number | null;
}

interface Approaching {
  id: string;
  jmeno: string;
  kategorie: string;
  cislo: number | null;
  lastSplit: string;
  tempo: string;
  eta: string | null;
}

interface Finisher {
  id: string;
  jmeno: string;
  klub: string;
  kategorie: string;
  cislo: number | null;
  cas: string;
  poradi: number | null;
}

export default async function ModeratorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const [zavodnici, kategorie, body, zaznamy] = await Promise.all([
    db.query.zavodnik.findMany({
      where: eq(zavT.akceId, id),
      columns: {
        id: true,
        jmeno: true,
        prijmeni: true,
        startovniCislo: true,
        oddil: true,
        mesto: true,
        kategorieId: true,
      },
    }),
    db.query.kategorie.findMany({
      where: eq(kategorieT.akceId, id),
      columns: { id: true, nazev: true, kod: true, casStartu: true },
    }),
    db.query.mericiBod.findMany({
      where: eq(mericiBod.akceId, id),
      orderBy: (b, { asc }) => [asc(b.poradi)],
    }),
    db.query.cilovyZaznam.findMany({
      where: eq(cilovyZaznam.akceId, id),
      columns: { zavodnikId: true, casCile: true, stav: true, bodId: true },
    }),
  ]);

  const finishBodId = body.find((b) => b.jeCil)?.id ?? null;
  const finishGate = body.find((b) => b.jeCil) ?? null;
  const bodyDomain: MericiBodDomain[] = body.map((b) => ({
    id: b.id,
    nazev: b.nazev,
    poradi: b.poradi,
    vzdalenostM: b.vzdalenostM,
    jeCil: b.jeCil,
  }));

  const katMap = new Map(kategorie.map((k) => [k.id, k]));
  const zavMap = new Map(zavodnici.map((z) => [z.id, z]));

  function startMsProZav(zavId: string): number | null {
    const z = zavMap.get(zavId);
    const kat = z?.kategorieId ? katMap.get(z.kategorieId) : undefined;
    const start = kat?.casStartu ?? akce!.casStartu;
    return start ? ms(start) : null;
  }
  function katLabel(zavId: string): string {
    const z = zavMap.get(zavId);
    const kat = z?.kategorieId ? katMap.get(z.kategorieId) : undefined;
    return kat ? kat.kod || kat.nazev : "—";
  }
  function jmenoZav(zavId: string): string {
    const z = zavMap.get(zavId);
    return z ? `${z.jmeno} ${z.prijmeni}` : "—";
  }
  function klubZav(zavId: string): string {
    const z = zavMap.get(zavId);
    return z ? z.oddil || z.mesto || "" : "";
  }

  // Platné průchody podle závodníka.
  const passagesByZav = new Map<string, SplitZaznam[]>();
  for (const z of zaznamy) {
    if (!z.zavodnikId || z.stav !== "platny") continue;
    const arr = passagesByZav.get(z.zavodnikId) ?? [];
    arr.push({ bodId: z.bodId, casCile: z.casCile, stav: z.stav });
    passagesByZav.set(z.zavodnikId, arr);
  }

  const isFinish = (bodId: string | null) =>
    bodId === finishBodId || (finishBodId === null && bodId === null);

  // --- PRÁVĚ DOBĚHLI ---
  interface FinRaw {
    id: string;
    finishMs: number;
    cistyMs: number | null;
  }
  const finRaw: FinRaw[] = [];
  const approachingIds: string[] = [];

  for (const [zavId, pas] of passagesByZav) {
    const finishTimes = pas.filter((p) => isFinish(p.bodId)).map((p) => ms(p.casCile));
    if (finishTimes.length > 0) {
      const finishMs = Math.min(...finishTimes);
      const startMs = startMsProZav(zavId);
      finRaw.push({
        id: zavId,
        finishMs,
        cistyMs: startMs !== null ? finishMs - startMs : null,
      });
    } else {
      const hasIntermediate = pas.some(
        (p) => p.bodId !== null && p.bodId !== finishBodId,
      );
      if (hasIntermediate) approachingIds.push(zavId);
    }
  }

  // Umístění: podle čistého času vzestupně napříč všemi doběhnuvšími.
  const poradiMap = new Map<string, number>();
  finRaw
    .filter((f) => f.cistyMs !== null)
    .sort((a, b) => a.cistyMs! - b.cistyMs!)
    .forEach((f, i) => poradiMap.set(f.id, i + 1));

  const finishers: Finisher[] = [...finRaw]
    .sort((a, b) => b.finishMs - a.finishMs) // nejnovější první
    .slice(0, 8)
    .map((f) => ({
      id: f.id,
      jmeno: jmenoZav(f.id),
      klub: klubZav(f.id),
      kategorie: katLabel(f.id),
      cislo: zavMap.get(f.id)?.startovniCislo ?? null,
      cas: f.cistyMs !== null ? cistyCas(f.cistyMs) : "—",
      poradi: poradiMap.get(f.id) ?? null,
    }));

  // --- BLÍŽÍ SE ---
  interface AppRaw extends Approaching {
    lastInterMs: number;
  }
  const appRaw: AppRaw[] = approachingIds.map((zavId) => {
    const pas = passagesByZav.get(zavId) ?? [];
    const startMs = startMsProZav(zavId);
    const splity = splityZavodnika(pas, bodyDomain, startMs);
    // Poslední absolvovaná průběžná (ne cílová) brána.
    const passedInter = splity.filter(
      (s) => s.kumulativMs !== null && !s.bod.jeCil,
    );
    const last = passedInter.length ? passedInter[passedInter.length - 1] : null;

    // Absolutní čas posledního průběžného průchodu (pro řazení).
    const lastInterMs = Math.max(
      ...pas
        .filter((p) => p.bodId !== null && p.bodId !== finishBodId)
        .map((p) => ms(p.casCile)),
    );

    let eta: string | null = null;
    if (
      last &&
      last.kumulativMs !== null &&
      last.tempoSecNaKm !== null &&
      finishGate &&
      finishGate.vzdalenostM !== null &&
      last.bod.vzdalenostM !== null
    ) {
      const remainingM = finishGate.vzdalenostM - last.bod.vzdalenostM;
      if (remainingM > 0) {
        // s/km × m / 1000 = s → ×1000 = ms  ⇒  remainingM × tempoSecNaKm (ms)
        const remainingMs = remainingM * last.tempoSecNaKm;
        eta = mss(last.kumulativMs + remainingMs);
      }
    }

    return {
      id: zavId,
      jmeno: jmenoZav(zavId),
      kategorie: katLabel(zavId),
      cislo: zavMap.get(zavId)?.startovniCislo ?? null,
      lastSplit:
        last && last.kumulativMs !== null ? cistyCas(last.kumulativMs) : "—",
      tempo: last ? formatTempo(last.tempoSecNaKm) : "—",
      eta,
      lastInterMs,
    };
  });
  appRaw.sort((a, b) => b.lastInterMs - a.lastInterMs); // nejnovější průchod první
  const approaching: Approaching[] = appRaw;

  // --- NA ŘADĚ ---
  let featured: Featured | null = null;
  if (approaching.length > 0) {
    const a = approaching[0];
    featured = {
      jmeno: a.jmeno,
      klub: klubZav(a.id),
      kategorie: a.kategorie,
      cislo: a.cislo,
      lastSplit: a.lastSplit,
      tempo: a.tempo,
      eta: a.eta ?? undefined,
    };
  } else if (finishers.length > 0) {
    const f = finishers[0];
    featured = {
      jmeno: f.jmeno,
      klub: f.klub,
      kategorie: f.kategorie,
      cislo: f.cislo,
      cas: f.cas,
      poradi: f.poradi,
    };
  }

  const bezBran = body.length === 0;

  return (
    <main className="cal-dots-dark min-h-screen bg-ink-950 p-8 text-white">
      <Refresh />

      {/* Hlavička */}
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/admin/akce/${id}`}
            className="mb-2 inline-flex items-center gap-1 rounded-[8px] border border-white/15 px-2.5 py-1 font-technical text-[11px] uppercase tracking-[.08em] text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            ← Zpět na akci
          </Link>
          <div className="cal-eyebrow text-teal-300">Moderátor</div>
          <h1 className="mt-1 truncate font-display text-3xl font-bold tracking-tight">
            {akce.nazev}
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-2.5 py-1 font-technical text-[10.5px] font-medium uppercase tracking-[.06em] text-teal-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          Živě
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* NA ŘADĚ */}
        <section className="rounded-[20px] border-2 border-teal-400/70 bg-ink-900/60 p-8 shadow-[0_0_40px_-12px_rgba(80,176,144,0.5)]">
          <div className="cal-eyebrow text-teal-300">Na řadě</div>
          {featured ? (
            <div className="mt-4">
              <div className="flex items-baseline gap-3">
                {featured.cislo !== null && (
                  <span className="font-technical text-2xl font-bold tabular-nums text-teal-300">
                    #{featured.cislo}
                  </span>
                )}
                <h2 className="font-display text-4xl font-bold leading-tight">
                  {featured.jmeno}
                </h2>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-ink-300">
                {featured.klub && <span>{featured.klub}</span>}
                {featured.klub && <span className="text-ink-500">·</span>}
                <span className="font-technical uppercase tracking-[.06em] text-teal-300">
                  {featured.kategorie}
                </span>
              </div>

              {/* Blížící se: split/tempo/ETA */}
              {featured.eta || featured.lastSplit ? (
                <div className="mt-6 flex flex-wrap gap-8">
                  {featured.lastSplit && (
                    <div>
                      <div className="cal-eyebrow text-ink-400">
                        Poslední mezičas
                      </div>
                      <div className="mt-1 font-technical text-3xl font-bold tabular-nums">
                        {featured.lastSplit}
                      </div>
                      {featured.tempo && (
                        <div className="mt-0.5 font-technical text-sm text-ink-300">
                          {featured.tempo}
                        </div>
                      )}
                    </div>
                  )}
                  {featured.eta && (
                    <div>
                      <div className="cal-eyebrow text-ink-400">
                        Odhad do cíle
                      </div>
                      <div className="mt-1 font-technical text-3xl font-bold tabular-nums text-teal-300">
                        ~{featured.eta}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Fallback: doběhnuvší jako featured */}
              {featured.cas && (
                <div className="mt-6 flex items-center gap-6">
                  <MedalCircle poradi={featured.poradi ?? null} />
                  <div>
                    <div className="cal-eyebrow text-ink-400">Cílový čas</div>
                    <div className="mt-1 font-technical text-4xl font-bold tabular-nums text-teal-300">
                      {featured.cas}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-ink-300">
              Zatím nikdo na trati ani v cíli.
            </p>
          )}
        </section>

        {/* BLÍŽÍ SE */}
        <section className="rounded-[20px] border border-ink-800 bg-ink-900/40 p-6">
          <div className="cal-eyebrow text-teal-300">Blíží se</div>
          {bezBran ? (
            <p className="mt-4 text-sm text-ink-300">
              Sledování na trati vyžaduje měřicí body. Tato akce žádné nemá —
              zobrazují se jen doběhnuvší.
            </p>
          ) : approaching.length === 0 ? (
            <p className="mt-4 text-sm text-ink-300">
              Nikdo aktuálně mezi bránami a cílem.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {approaching.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-[12px] bg-ink-950/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {a.cislo !== null && (
                        <span className="font-technical text-xs tabular-nums text-ink-400">
                          #{a.cislo}
                        </span>
                      )}
                      <span className="truncate font-display font-medium">
                        {a.jmeno}
                      </span>
                    </div>
                    <div className="font-technical text-[11px] uppercase tracking-[.06em] text-ink-400">
                      {a.kategorie} · {a.lastSplit}
                    </div>
                  </div>
                  {a.eta && (
                    <span className="flex-none font-technical text-sm font-bold tabular-nums text-teal-300">
                      ETA ~{a.eta}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* PRÁVĚ DOBĚHLI */}
      <section className="mt-6 rounded-[20px] border border-ink-800 bg-ink-900/40 p-6">
        <div className="cal-eyebrow text-teal-300">Právě doběhli</div>
        {finishers.length === 0 ? (
          <p className="mt-4 text-sm text-ink-300">Zatím nikdo v cíli.</p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {finishers.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-[12px] bg-ink-950/50 px-3 py-2.5"
              >
                <MedalCircle poradi={f.poradi} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display font-medium">
                    {f.jmeno}
                  </div>
                  <div className="font-technical text-[11px] uppercase tracking-[.06em] text-ink-400">
                    {f.kategorie}
                    {f.klub ? ` · ${f.klub}` : ""}
                  </div>
                </div>
                <span className="flex-none font-technical text-lg font-bold tabular-nums text-teal-300">
                  {f.cas}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 flex justify-center">
        <PoweredBy variant="dark" />
      </div>
    </main>
  );
}
