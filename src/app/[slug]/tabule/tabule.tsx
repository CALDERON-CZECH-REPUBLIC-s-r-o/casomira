"use client";

import { useEffect, useState } from "react";
import { cistyCas, ztrata } from "@/lib/cas";
import { MedalCircle, PoweredBy } from "@/app/admin/_components/ui";
import type {
  VerejnaData,
  VerejnaSkupina,
  VerejnyRadek,
} from "@/lib/verejna-data";

const STAV_LABEL: Record<string, string> = {
  DNF: "DNF",
  DNS: "DNS",
  DSQ: "DSQ",
};

/** Kolik řádků se vejde na jednu „stránku" tabule (okno pro auto-scroll). */
const OKNO = 12;

function casBunka(r: VerejnyRadek): string {
  if (r.stav === "klasifikovan" && r.casMs !== null) return cistyCas(r.casMs);
  if (r.stav === "bez_casu") return "na trati";
  return STAV_LABEL[r.stav] ?? "—";
}

export function Tabule({
  slug,
  initial,
  mode,
}: {
  slug: string;
  initial: VerejnaData;
  mode: "celkova" | "kategorie";
}) {
  const [data, setData] = useState<VerejnaData>(initial);
  const [zive, setZive] = useState(true);

  // Polling à 5 s, jen když akce „běží" (měření spuštěno) — zrcadlí verejna-akce.tsx.
  useEffect(() => {
    if (!data.akce.bezi) return;
    let zruseno = false;
    const tik = async () => {
      try {
        const r = await fetch(`/api/verejne/${slug}`, { cache: "no-store" });
        if (!r.ok) throw new Error();
        const nova = (await r.json()) as VerejnaData;
        if (!zruseno) {
          setData(nova);
          setZive(true);
        }
      } catch {
        if (!zruseno) setZive(false);
      }
    };
    const i = setInterval(tik, 5000);
    return () => {
      zruseno = true;
      clearInterval(i);
    };
  }, [slug, data.akce.bezi]);

  const a = data.akce;
  const kategorie = data.vysledky.kategorie.filter((sk) => sk.radky.length > 0);

  return (
    <div className="cal-dots-dark flex min-h-screen flex-col bg-ink-950 p-8 text-white">
      {/* Hlavička */}
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-bold leading-tight">
            {a.nazev}
          </h1>
          {a.misto && (
            <p className="mt-1 font-technical text-sm text-ink-400">{a.misto}</p>
          )}
        </div>
        <div className="flex flex-none items-center gap-4">
          <ZiveChip bezi={a.bezi} zive={zive} />
          <div className="flex w-28 aspect-square flex-col items-center justify-center rounded-[12px] border border-white/15 bg-white/5">
            <span className="font-technical text-[10px] text-ink-400">
              /{slug}
            </span>
          </div>
        </div>
      </header>

      {/* Tělo */}
      {mode === "kategorie" ? (
        <KategorieTabule kategorie={kategorie} />
      ) : (
        <CelkovaTabule skupina={data.vysledky.celkova} />
      )}

      {/* Patička — nenápadně v rohu, neruší tabuli */}
      <div className="mt-4 flex-none text-right opacity-70">
        <PoweredBy variant="dark" />
      </div>
    </div>
  );
}

/* ---------- 13a: celková tabule s auto-scrollem ---------- */

function CelkovaTabule({ skupina }: { skupina: VerejnaSkupina }) {
  const [okno, setOkno] = useState(0);
  const radky = skupina.radky;
  const poctiOken = Math.max(1, Math.ceil(radky.length / OKNO));

  // Posun okna à 4 s (jen když se seznam nevejde najednou).
  useEffect(() => {
    if (poctiOken <= 1) return; // jedno okno → není co posouvat (okno % poctiOken=0)
    const i = setInterval(() => setOkno((o) => (o + 1) % poctiOken), 4000);
    return () => clearInterval(i);
  }, [poctiOken]);

  if (radky.length === 0) return <PrazdnaTabule />;

  const aktivni = okno % poctiOken;
  const vyrez = radky.slice(aktivni * OKNO, aktivni * OKNO + OKNO);

  return (
    <main className="mt-8 flex flex-1 flex-col">
      <SkupinaNadpis kod={skupina.kod} nazev={skupina.nazev} />
      <ZebricekTabulka radky={vyrez} />
    </main>
  );
}

/* ---------- 13b: cyklující tabule po kategoriích ---------- */

function KategorieTabule({ kategorie }: { kategorie: VerejnaSkupina[] }) {
  const [idx, setIdx] = useState(0);
  const N = kategorie.length;

  // Cyklování à 10 s (jen když je kategorií víc než jedna).
  useEffect(() => {
    if (N <= 1) return; // jedna kategorie → necyklovat (idx % N=0)
    const i = setInterval(() => setIdx((x) => (x + 1) % N), 10000);
    return () => clearInterval(i);
  }, [N]);

  if (N === 0) return <PrazdnaTabule />;

  const aktivni = idx % N;
  const skupina = kategorie[aktivni];
  const dalsi = kategorie[(aktivni + 1) % N];

  return (
    <main className="mt-8 flex flex-1 flex-col">
      <SkupinaNadpis kod={skupina.kod} nazev={skupina.nazev} />
      <ZebricekTabulka radky={skupina.radky} />

      {N > 1 && (
        <div className="mt-auto flex items-center gap-6 pt-6">
          <div className="flex flex-1 gap-1.5">
            {kategorie.map((sk, i) => (
              <span
                key={sk.kod ?? sk.nazev}
                className={`h-1.5 flex-1 rounded-full ${
                  i === aktivni ? "bg-teal-400" : "bg-white/15"
                }`}
              />
            ))}
          </div>
          <span className="flex-none font-technical text-sm text-ink-400">
            další: {dalsi.kod ? `${dalsi.kod} ` : ""}
            {dalsi.nazev}
          </span>
          <span className="flex-none font-technical text-sm tabular-nums text-ink-300">
            {aktivni + 1} / {N}
          </span>
        </div>
      )}
    </main>
  );
}

/* ---------- Sdílené prvky ---------- */

function SkupinaNadpis({
  kod,
  nazev,
}: {
  kod: string | null;
  nazev: string;
}) {
  return (
    <h2 className="mb-4 flex items-baseline gap-3 font-display text-3xl font-bold">
      {kod && <span className="text-teal-300">{kod}</span>}
      <span>{nazev}</span>
    </h2>
  );
}

const GRID = "grid grid-cols-[80px_1fr_100px_minmax(0,1fr)_180px_150px] items-center gap-4";

function ZebricekTabulka({ radky }: { radky: VerejnyRadek[] }) {
  return (
    <div>
      <div
        className={`${GRID} border-b border-white/15 pb-2 font-technical text-sm uppercase tracking-[.08em] text-ink-400`}
      >
        <span className="text-center">Poř.</span>
        <span>Závodník</span>
        <span className="text-center">Ročník</span>
        <span>Oddíl</span>
        <span className="text-right">Čas</span>
        <span className="text-right">Ztráta</span>
      </div>
      <div className="divide-y divide-white/10">
        {radky.map((r) => (
          <ZebricekRadek key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
}

function ZebricekRadek({ r }: { r: VerejnyRadek }) {
  const nedobehl = r.stav !== "klasifikovan";
  const jeMedaile = r.stav === "klasifikovan" && !!r.poradi && r.poradi <= 3;
  return (
    <div className={`${GRID} py-3 text-2xl ${nedobehl ? "text-ink-500" : ""}`}>
      <span className="flex justify-center">
        {jeMedaile ? (
          <span className="inline-flex scale-150 justify-center">
            <MedalCircle poradi={r.poradi} />
          </span>
        ) : (
          <span className="font-technical tabular-nums text-ink-300">
            {r.poradi ?? "—"}
          </span>
        )}
      </span>
      <span className="min-w-0 truncate font-medium">
        {r.prijmeni} {r.jmeno}
      </span>
      <span className="text-center font-technical tabular-nums text-ink-400">
        {r.rocnik ?? "—"}
      </span>
      <span className="min-w-0 truncate text-ink-300">{r.oddil || "—"}</span>
      <span className="text-right font-technical font-semibold tabular-nums">
        {casBunka(r)}
      </span>
      <span className="text-right font-technical tabular-nums text-ink-400">
        {r.stav === "klasifikovan" ? ztrata(r.ztrataMs) : "—"}
      </span>
    </div>
  );
}

function ZiveChip({ bezi, zive }: { bezi: boolean; zive: boolean }) {
  if (!bezi || !zive) {
    return (
      <span className="flex-none rounded-full bg-warning-bg px-3 py-1.5 font-technical text-sm font-medium uppercase tracking-[.06em] text-warning">
        offline
      </span>
    );
  }
  return (
    <span className="flex-none inline-flex items-center gap-2 rounded-full bg-teal-500/15 px-3 py-1.5 font-technical text-sm font-medium uppercase tracking-[.06em] text-teal-300">
      <span className="cal-livedot h-2 w-2 rounded-full bg-teal-400" />
      Živě
    </span>
  );
}

function PrazdnaTabule() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <p className="font-display text-4xl font-bold text-ink-400">
        Výsledky se objeví po startu
      </p>
    </main>
  );
}
