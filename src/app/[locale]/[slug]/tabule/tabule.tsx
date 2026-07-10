"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cistyCas, ztrata, uplynulyCas } from "@/lib/cas";
import { MedalCircle, PoweredBy } from "@/app/[locale]/admin/_components/ui";
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

/** Ročník historie s vítězi M/Ž (strukturně shodné s lib/historie.ts). */
interface HistorieRocnik {
  rok: number;
  akceNazev: string;
  muz: { jmeno: string; casMs: number } | null;
  zena: { jmeno: string; casMs: number } | null;
}

type Mode = "vse" | "kategorie" | "celkova";

/** Odhad výšky jednoho řádku žebříčku (px) — raději nadhodnotit (bez scrollu). */
const ROW_PX = 60;
/** Výška hlavičky tabulky žebříčku (px). */
const TABLE_HEAD_PX = 44;
/** Výška nadpisu skupiny nad tabulkou (px). */
const NADPIS_PX = 60;

function casBunka(r: VerejnyRadek, onCourse: string): string {
  if (r.stav === "klasifikovan" && r.casMs !== null) return cistyCas(r.casMs);
  if (r.stav === "bez_casu") return onCourse;
  return STAV_LABEL[r.stav] ?? "—";
}

/** Jedna „stránka" projekce (vejde se na displej, rotuje se mezi nimi). */
type Stranka =
  | {
      typ: "vysledky";
      skupina: VerejnaSkupina;
      radky: VerejnyRadek[];
      strana: number;
      stran: number;
    }
  | { typ: "historie"; rocniky: HistorieRocnik[] };

function sestavStranky(
  data: VerejnaData,
  mode: Mode,
  historie: HistorieRocnik[],
  perPage: number,
): Stranka[] {
  const stranky: Stranka[] = [];
  const pp = Math.max(1, perPage);

  const pridej = (sk: VerejnaSkupina) => {
    if (sk.radky.length === 0) return;
    const stran = Math.max(1, Math.ceil(sk.radky.length / pp));
    for (let i = 0; i < stran; i++) {
      stranky.push({
        typ: "vysledky",
        skupina: sk,
        radky: sk.radky.slice(i * pp, i * pp + pp),
        strana: i + 1,
        stran,
      });
    }
  };

  if (mode !== "kategorie") pridej(data.vysledky.celkova);
  if (mode !== "celkova") {
    for (const sk of data.vysledky.kategorie) pridej(sk);
  }
  if (mode === "vse" && historie.length > 0) {
    stranky.push({ typ: "historie", rocniky: historie });
  }
  return stranky;
}

export function Tabule({
  slug,
  initial,
  mode,
  qr,
  historie,
}: {
  slug: string;
  initial: VerejnaData;
  mode: Mode;
  qr: string;
  historie: HistorieRocnik[];
}) {
  const [data, setData] = useState<VerejnaData>(initial);
  const [zive, setZive] = useState(true);
  const [nowMs, setNowMs] = useState<number | null>(null);

  // Polling à 5 s, jen když akce „běží" (měření spuštěno).
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

  // Běžící čas závodu (LED) — z casStartu.
  useEffect(() => {
    if (!a.bezi || !a.casStartu) return;
    const i = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(i);
  }, [a.bezi, a.casStartu]);
  const clock =
    a.casStartu && nowMs != null
      ? uplynulyCas(nowMs - new Date(a.casStartu).getTime())
      : null;

  // Kolik řádků se vejde do těla projekce (fit-to-screen, bez scrollu).
  // Měříme vždy přítomný <main>, nezávisle na typu aktivní stránky.
  const mainRef = useRef<HTMLElement>(null);
  const [perPage, setPerPage] = useState(10);
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const prepocitej = () => {
      const h = el.clientHeight - NADPIS_PX - TABLE_HEAD_PX;
      const n = Math.max(1, Math.floor(h / ROW_PX));
      setPerPage(n);
    };
    prepocitej();
    const ro = new ResizeObserver(prepocitej);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stranky = useMemo(
    () => sestavStranky(data, mode, historie, perPage),
    [data, mode, historie, perPage],
  );

  // Rotace stránek à 7 s.
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (stranky.length <= 1) return;
    const i = setInterval(() => setIdx((o) => o + 1), 7000);
    return () => clearInterval(i);
  }, [stranky.length]);

  const aktivni =
    stranky.length > 0 ? stranky[idx % stranky.length] : null;

  return (
    <div className="cal-dots-dark flex h-screen flex-col overflow-hidden bg-ink-950 p-8 text-white">
      {/* Hlavička */}
      <header className="flex flex-none items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-bold leading-tight">
            {a.nazev}
          </h1>
          {a.misto && (
            <p className="mt-1 font-technical text-sm text-ink-400">{a.misto}</p>
          )}
        </div>
        <div className="flex flex-none items-center gap-5">
          {clock && (
            <span
              className="font-technical text-5xl font-bold tabular-nums"
              style={{
                color: "#FFB000",
                textShadow: "0 0 22px rgba(255,176,0,.35)",
              }}
            >
              {clock}
            </span>
          )}
          <ZiveChip bezi={a.bezi} zive={zive} />
          {/* QR na veřejné výsledky */}
          <div className="flex w-28 flex-col items-center gap-1 rounded-[12px] bg-white p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="" className="h-full w-full" />
            <span className="font-technical text-[10px] leading-none text-ink-700">
              /{slug}
            </span>
          </div>
        </div>
      </header>

      {/* Tělo — jedna rotující stránka */}
      <main ref={mainRef} className="mt-8 flex min-h-0 flex-1 flex-col">
        {aktivni === null ? (
          <PrazdnaTabule />
        ) : aktivni.typ === "historie" ? (
          <HistorieObrazovka rocniky={aktivni.rocniky} />
        ) : (
          <>
            <SkupinaNadpis
              kod={aktivni.skupina.kod}
              nazev={aktivni.skupina.nazev}
              strana={aktivni.strana}
              stran={aktivni.stran}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <ZebricekTabulka radky={aktivni.radky} />
            </div>
          </>
        )}
      </main>

      {/* Patička */}
      <div className="mt-4 flex flex-none items-center justify-between">
        <StrankyIndikator pocet={stranky.length} aktivni={idx} />
        <div className="opacity-70">
          <PoweredBy variant="dark" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Obrazovka historie vítězů ---------- */

function HistorieObrazovka({ rocniky }: { rocniky: HistorieRocnik[] }) {
  return (
    <>
      <h2 className="mb-4 flex-none font-display text-3xl font-bold">
        <span className="text-teal-300">Historie</span> — vítězové po ročnících
      </h2>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-4 border-b border-white/15 pb-2 font-technical text-sm uppercase tracking-[.08em] text-ink-400">
          <span>Ročník</span>
          <span>Muži</span>
          <span>Ženy</span>
        </div>
        <div className="divide-y divide-white/10">
          {rocniky.map((r) => (
            <div
              key={`${r.akceNazev}-${r.rok}`}
              className="grid grid-cols-[120px_1fr_1fr] items-center gap-4 py-3 text-2xl"
            >
              <span className="font-technical font-bold tabular-nums text-teal-200">
                {r.rok}
              </span>
              <VitezBunka vitez={r.muz} />
              <VitezBunka vitez={r.zena} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function VitezBunka({
  vitez,
}: {
  vitez: { jmeno: string; casMs: number } | null;
}) {
  if (!vitez) return <span className="text-ink-500">—</span>;
  return (
    <span className="flex min-w-0 items-baseline gap-3">
      <span className="min-w-0 truncate font-medium">{vitez.jmeno}</span>
      <span className="flex-none font-technical font-semibold tabular-nums text-ink-300">
        {cistyCas(vitez.casMs)}
      </span>
    </span>
  );
}

/* ---------- Sdílené prvky ---------- */

function SkupinaNadpis({
  kod,
  nazev,
  strana,
  stran,
}: {
  kod: string | null;
  nazev: string;
  strana: number;
  stran: number;
}) {
  return (
    <h2 className="mb-4 flex flex-none items-baseline gap-3 font-display text-3xl font-bold">
      {kod && <span className="text-teal-300">{kod}</span>}
      <span>{nazev}</span>
      {stran > 1 && (
        <span className="font-technical text-lg font-medium tabular-nums text-ink-400">
          {strana}/{stran}
        </span>
      )}
    </h2>
  );
}

const GRID =
  "grid grid-cols-[80px_1fr_100px_minmax(0,1fr)_180px_150px] items-center gap-4";

function ZebricekTabulka({ radky }: { radky: VerejnyRadek[] }) {
  const t = useTranslations("results");
  return (
    <div>
      <div
        className={`${GRID} border-b border-white/15 pb-2 font-technical text-sm uppercase tracking-[.08em] text-ink-400`}
      >
        <span className="text-center">{t("colPos")}</span>
        <span>{t("colName")}</span>
        <span className="text-center">{t("colYear")}</span>
        <span>{t("colClub")}</span>
        <span className="text-right">{t("colTime")}</span>
        <span className="text-right">{t("colGap")}</span>
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
  const t = useTranslations("results");
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
        {casBunka(r, t("onCourse"))}
      </span>
      <span className="text-right font-technical tabular-nums text-ink-400">
        {r.stav === "klasifikovan" ? ztrata(r.ztrataMs) : "—"}
      </span>
    </div>
  );
}

function StrankyIndikator({
  pocet,
  aktivni,
}: {
  pocet: number;
  aktivni: number;
}) {
  if (pocet <= 1) return <span />;
  const a = aktivni % pocet;
  return (
    <div className="flex flex-1 gap-1.5 pr-6">
      {Array.from({ length: pocet }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-6 rounded-full ${
            i === a ? "bg-teal-400" : "bg-white/15"
          }`}
        />
      ))}
    </div>
  );
}

function ZiveChip({ bezi, zive }: { bezi: boolean; zive: boolean }) {
  const t = useTranslations("results");
  if (!bezi || !zive) {
    return (
      <span className="flex-none rounded-full bg-warning-bg px-3 py-1.5 font-technical text-sm font-medium uppercase tracking-[.06em] text-warning">
        {t("offline")}
      </span>
    );
  }
  return (
    <span className="flex-none inline-flex items-center gap-2 rounded-full bg-teal-500/15 px-3 py-1.5 font-technical text-sm font-medium uppercase tracking-[.06em] text-teal-300">
      <span className="cal-livedot h-2 w-2 rounded-full bg-teal-400" />
      {t("live")}
    </span>
  );
}

function PrazdnaTabule() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="font-display text-4xl font-bold text-ink-400">
        Výsledky se objeví po startu
      </p>
    </div>
  );
}
