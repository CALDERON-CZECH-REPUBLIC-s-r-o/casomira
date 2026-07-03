"use client";

import { useEffect, useState } from "react";
import { cistyCas, ztrata, casDneKratky } from "@/lib/cas";
import { Btn, Card, MedalCircle, Pill, PoweredBy } from "@/app/admin/_components/ui";
import { Dialog, SegmentedToggle } from "@/app/admin/_components/ui-client";
import type {
  VerejnaData,
  VerejnaSkupina,
  VerejnyRadek,
  VerejnyStartRadek,
} from "@/lib/verejna-data";

const STAV_LABEL: Record<string, string> = {
  DNF: "DNF",
  DNS: "DNS",
  DSQ: "DSQ",
};

function casBunka(r: VerejnyRadek, bezi: boolean): string {
  if (r.stav === "klasifikovan" && r.casMs !== null) return cistyCas(r.casMs);
  if (r.stav === "bez_casu") return bezi ? "na trati" : "—";
  return STAV_LABEL[r.stav] ?? "—";
}

type Detail = { radek: VerejnyRadek; skupina: VerejnaSkupina };

export function VerejnaAkce({
  slug,
  initial,
}: {
  slug: string;
  initial: VerejnaData;
}) {
  const [data, setData] = useState<VerejnaData>(initial);
  const [tab, setTab] = useState<"vysledky" | "startovka">("vysledky");
  const [rozsah, setRozsah] = useState<"kategorie" | "celkova">("kategorie");
  const [zive, setZive] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);

  // Polling à 5 s, jen když je akce „živá" (běží měření).
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
  const d = new Date(a.datum + "T00:00:00");
  const datumText = `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:max-w-5xl">
      {/* Hero hlavička akce */}
      <header className="cal-dots-dark rounded-[16px] bg-ink-950 px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold leading-tight">
              {a.nazev}
            </h1>
            <p className="mt-1 font-technical text-[12px] text-ink-300">
              {datumText}
              {a.misto ? ` · ${a.misto}` : ""}
            </p>
          </div>
          <ZiveChip bezi={a.bezi} zive={zive} />
        </div>
        {a.bezi && (
          <p className="mt-3 font-technical text-[11px] text-ink-400">
            aktualizováno {casDneKratky(a.aktualizovano)}
          </p>
        )}
      </header>

      {/* Přepínače */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SegmentedToggle
          key={tab}
          defaultValue={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { value: "vysledky", label: "Výsledky" },
            { value: "startovka", label: "Startovní listina" },
          ]}
        />
        <SegmentedToggle
          defaultValue={rozsah}
          onChange={(v) => setRozsah(v as typeof rozsah)}
          options={[
            { value: "kategorie", label: "po kategoriích" },
            { value: "celkova", label: "celkově" },
          ]}
        />
      </div>

      <div className="mt-5">
        {tab === "vysledky" ? (
          !a.bezi ? (
            <PredStartem
              datumText={datumText}
              onStartovka={() => setTab("startovka")}
            />
          ) : rozsah === "celkova" ? (
            <VysledkySkupina
              skupina={data.vysledky.celkova}
              bezi={a.bezi}
              celkova
              onDetail={setDetail}
            />
          ) : data.vysledky.kategorie.length === 0 ? (
            <Prazdno text="Zatím žádné výsledky." />
          ) : (
            data.vysledky.kategorie.map((sk) => (
              <VysledkySkupina
                key={sk.kod ?? sk.nazev}
                skupina={sk}
                bezi={a.bezi}
                onDetail={setDetail}
              />
            ))
          )
        ) : rozsah === "celkova" ? (
          <StartTabulka zavodnici={data.startovni.celkova} sKategorii />
        ) : data.startovni.kategorie.length === 0 ? (
          <Prazdno text="Žádní přihlášení." />
        ) : (
          data.startovni.kategorie.map((k) => (
            <section key={k.kod ?? k.nazev} className="mb-6">
              <KategorieHlavicka kod={k.kod} nazev={k.nazev} />
              <StartTabulka zavodnici={k.zavodnici} />
            </section>
          ))
        )}
      </div>

      <footer className="mt-10 flex flex-col items-center gap-1.5 text-center font-technical text-[11px] text-ink-400">
        <span>Časomíra · výsledky online</span>
        <PoweredBy />
      </footer>

      <DetailDialog
        detail={detail}
        celkova={data.vysledky.celkova}
        bezi={a.bezi}
        onClose={() => setDetail(null)}
      />
    </main>
  );
}

/* ---------- Živá plaketa ---------- */

function ZiveChip({ bezi, zive }: { bezi: boolean; zive: boolean }) {
  if (!bezi) {
    return (
      <span className="flex-none rounded-full bg-white/10 px-2.5 py-1 font-technical text-[10.5px] font-medium uppercase tracking-[.06em] text-ink-300">
        před startem
      </span>
    );
  }
  if (!zive) {
    return (
      <span className="flex-none rounded-full bg-warning-bg px-2.5 py-1 font-technical text-[10.5px] font-medium uppercase tracking-[.06em] text-warning">
        offline
      </span>
    );
  }
  return (
    <span className="flex-none inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-2.5 py-1 font-technical text-[10.5px] font-medium uppercase tracking-[.06em] text-teal-300">
      <span className="cal-livedot h-1.5 w-1.5 rounded-full bg-teal-400" />
      Živě
    </span>
  );
}

/* ---------- Před startem ---------- */

function PredStartem({
  datumText,
  onStartovka,
}: {
  datumText: string;
  onStartovka: () => void;
}) {
  return (
    <Card className="cal-dots flex flex-col items-center px-6 py-14 text-center">
      <h2 className="font-display text-xl font-bold text-ink-900">
        Závod ještě nezačal
      </h2>
      <p className="mt-2 font-technical text-[13px] text-ink-500">{datumText}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">
        Výsledky se zobrazí, jakmile bude spuštěno měření.
      </p>
      <Btn className="mt-6" onClick={onStartovka}>
        Zobrazit startovní listinu
      </Btn>
    </Card>
  );
}

/* ---------- Hlavička kategorie ---------- */

function KategorieHlavicka({
  kod,
  nazev,
  souhrn,
}: {
  kod: string | null;
  nazev: string;
  souhrn?: string;
}) {
  return (
    <div className="mb-2 flex items-baseline gap-2 border-b border-ink-150 pb-1.5">
      {kod && (
        <span className="font-technical font-bold text-teal-600">{kod}</span>
      )}
      <span className="font-medium text-ink-900">{nazev}</span>
      {souhrn && (
        <span className="ml-auto flex-none font-technical text-[11px] text-ink-400">
          {souhrn}
        </span>
      )}
    </div>
  );
}

/* ---------- Výsledková skupina (žebříček) ---------- */

function VysledkySkupina({
  skupina,
  bezi,
  celkova,
  onDetail,
}: {
  skupina: VerejnaSkupina;
  bezi: boolean;
  celkova?: boolean;
  onDetail: (d: Detail) => void;
}) {
  if (skupina.radky.length === 0) return null;
  const souhrn =
    `${skupina.klasifikovano} klas.` +
    (skupina.dnf ? ` · ${skupina.dnf} DNF` : "");
  return (
    <section className="mb-6">
      {!celkova && (
        <KategorieHlavicka
          kod={skupina.kod}
          nazev={skupina.nazev}
          souhrn={souhrn}
        />
      )}
      {/* Hlavička tabulky — jen desktop; zrcadlí šířky sloupců řádku */}
      <div className="hidden items-center gap-4 border-b border-ink-150 pb-1.5 font-technical text-[11px] uppercase tracking-[.06em] text-ink-400 lg:flex">
        <span className="w-[34px] flex-none text-center">Poř.</span>
        <span className="w-[56px] flex-none">Číslo</span>
        <span className="min-w-0 flex-[2]">Jméno</span>
        <span className="w-[64px] flex-none">Ročník</span>
        <span className="min-w-0 flex-1">Oddíl</span>
        <span className="w-[84px] flex-none text-right">Čas</span>
        <span className="w-[90px] flex-none text-right">Ztráta</span>
      </div>
      <div className="divide-y divide-ink-150">
        {skupina.radky.map((r) => (
          <VysledekRadek
            key={r.id}
            r={r}
            bezi={bezi}
            onClick={() => onDetail({ radek: r, skupina })}
          />
        ))}
      </div>
    </section>
  );
}

function VysledekRadek({
  r,
  bezi,
  onClick,
}: {
  r: VerejnyRadek;
  bezi: boolean;
  onClick: () => void;
}) {
  const nedobehl = r.stav !== "klasifikovan";
  const jeMedaile = r.stav === "klasifikovan" && !!r.poradi && r.poradi <= 3;
  return (
    <button
      type="button"
      onClick={onClick}
      className="cal-press flex w-full items-center gap-3 py-2.5 text-left lg:gap-4"
    >
      <span className="flex w-[34px] flex-none justify-center">
        {jeMedaile ? (
          <MedalCircle poradi={r.poradi} />
        ) : (
          <span className="font-technical text-[15px] tabular-nums text-ink-500">
            {r.poradi ?? "—"}
          </span>
        )}
      </span>
      {/* číslo — samostatný sloupec jen na desktopu */}
      <span className="hidden w-[56px] flex-none font-technical text-[14px] tabular-nums text-ink-400 lg:block">
        č.{r.cislo ?? "—"}
      </span>
      <span className="min-w-0 flex-1 lg:flex-[2]">
        <span
          className={`block truncate font-medium ${nedobehl ? "text-ink-400" : "text-ink-900"}`}
        >
          {r.prijmeni} {r.jmeno}
        </span>
        {/* dvouřádkový subtext jen na mobilu; na desktopu jsou č./oddíl vlastní sloupce */}
        <span className="block truncate font-technical text-[11px] text-ink-400 lg:hidden">
          č.{r.cislo ?? "—"}
          {r.oddil ? ` · ${r.oddil}` : ""}
        </span>
      </span>
      {/* ročník — jen desktop */}
      <span className="hidden w-[64px] flex-none font-technical text-[14px] tabular-nums text-ink-400 lg:block">
        {r.rocnik ?? "—"}
      </span>
      {/* oddíl — jen desktop */}
      <span className="hidden min-w-0 flex-1 truncate font-technical text-[14px] text-ink-400 lg:block">
        {r.oddil || "—"}
      </span>
      <span className="flex-none text-right lg:w-[84px]">
        <span
          className={`block font-technical font-semibold tabular-nums ${nedobehl ? "text-ink-400" : "text-ink-900"}`}
        >
          {casBunka(r, bezi)}
        </span>
        {/* ztráta pod časem jen na mobilu; na desktopu je vlastní sloupec */}
        {r.stav === "klasifikovan" && (
          <span className="block font-technical text-[11px] tabular-nums text-ink-400 lg:hidden">
            {ztrata(r.ztrataMs)}
          </span>
        )}
      </span>
      {/* ztráta — samostatný sloupec jen na desktopu */}
      <span className="hidden w-[90px] flex-none text-right font-technical text-[14px] tabular-nums text-ink-400 lg:block">
        {r.stav === "klasifikovan" ? ztrata(r.ztrataMs) : "—"}
      </span>
    </button>
  );
}

/* ---------- Detail závodníka (sdílitelná karta) ---------- */

function DetailDialog({
  detail,
  celkova,
  bezi,
  onClose,
}: {
  detail: Detail | null;
  celkova: VerejnaSkupina;
  bezi: boolean;
  onClose: () => void;
}) {
  const r = detail?.radek;
  const skupina = detail?.skupina;
  const celkovePoradi =
    r && celkova.radky.find((x) => x.id === r.id)?.poradi;
  const url = typeof window !== "undefined" ? window.location.href : "";

  return (
    <Dialog open={!!detail} onClose={onClose}>
      {r && skupina && (
        <>
          {/* Tmavá hlavička karty */}
          <div className="cal-dots-dark -mx-5 -mt-4 rounded-t-[22px] bg-ink-950 px-6 py-6 text-center text-white">
            {skupina.kod && (
              <div className="font-technical text-[11px] uppercase tracking-[.08em] text-teal-300">
                {skupina.kod}
              </div>
            )}
            <div className="mt-1 font-display text-xl font-bold">
              {r.prijmeni} {r.jmeno}
            </div>
            <div className="mt-3 font-technical text-4xl font-bold tabular-nums">
              {casBunka(r, bezi)}
            </div>
          </div>

          {/* Světlé tělo — umístění + detaily */}
          <div className="mt-5 divide-y divide-ink-150">
            <RadekDetailu
              label="V kategorii"
              hodnota={
                r.stav === "klasifikovan" && r.poradi
                  ? `${r.poradi}. z ${skupina.klasifikovano}`
                  : STAV_LABEL[r.stav] ?? "—"
              }
            />
            <RadekDetailu
              label="Celkově"
              hodnota={
                celkovePoradi
                  ? `${celkovePoradi}. z ${celkova.klasifikovano}`
                  : "—"
              }
            />
            <RadekDetailu
              label="Ztráta"
              hodnota={r.stav === "klasifikovan" ? ztrata(r.ztrataMs) : "—"}
            />
            <RadekDetailu label="Oddíl / Město" hodnota={r.oddil || "—"} />
          </div>

          {url && (
            <div className="mt-5 rounded-[10px] bg-ink-50 px-3 py-2.5">
              <div className="cal-eyebrow text-ink-400">Sdílet</div>
              <div className="mt-0.5 truncate font-technical text-[12px] text-ink-600">
                {url}
              </div>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}

function RadekDetailu({
  label,
  hodnota,
}: {
  label: string;
  hodnota: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-2.5">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="font-technical font-semibold tabular-nums text-ink-900">
        {hodnota}
      </span>
    </div>
  );
}

/* ---------- Startovní listina ---------- */

function StartTabulka({
  zavodnici,
  sKategorii,
}: {
  zavodnici: VerejnyStartRadek[];
  sKategorii?: boolean;
}) {
  return (
    <div className="mb-4 divide-y divide-ink-150">
      {zavodnici.map((z) => (
        <div key={z.id} className="flex items-center gap-3 py-2.5 lg:gap-4">
          <span className="w-[34px] flex-none text-center font-technical text-[15px] tabular-nums text-ink-500">
            {z.cislo ?? "—"}
          </span>
          <span className="min-w-0 flex-1 lg:flex-[2]">
            <span className="block truncate font-medium text-ink-900">
              {z.prijmeni} {z.jmeno}
            </span>
            {/* dvouřádkový subtext jen na mobilu; na desktopu vlastní sloupce */}
            <span className="block truncate font-technical text-[11px] text-ink-400 lg:hidden">
              {z.rocnik ? `roč. ${z.rocnik}` : ""}
              {z.rocnik && z.oddil ? " · " : ""}
              {z.oddil || (z.rocnik ? "" : "—")}
            </span>
          </span>
          {/* ročník — jen desktop */}
          <span className="hidden w-[64px] flex-none font-technical text-[14px] tabular-nums text-ink-400 lg:block">
            {z.rocnik ?? "—"}
          </span>
          {/* oddíl — jen desktop */}
          <span className="hidden min-w-0 flex-1 truncate font-technical text-[14px] text-ink-400 lg:block">
            {z.oddil || "—"}
          </span>
          {sKategorii && (
            <Pill ton="teal" className="flex-none">
              {z.kategorieKod ?? "—"}
            </Pill>
          )}
        </div>
      ))}
    </div>
  );
}

function Prazdno({ text }: { text: string }) {
  return (
    <p className="py-12 text-center text-sm text-ink-400">{text}</p>
  );
}
