"use client";

import {
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { cistyCas, ztrata, casDneKratky, uplynulyCas } from "@/lib/cas";
import { Btn, Card, Pill, PoweredBy } from "@/app/[locale]/admin/_components/ui";
import { Dialog, SegmentedToggle } from "@/app/[locale]/admin/_components/ui-client";
import { LangToggle } from "@/components/lang-toggle";
import { prihlasitSeNaAkci, type PrihlaskaState } from "@/server/prihlasky";
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

function casBunka(r: VerejnyRadek, bezi: boolean, onCourse: string): string {
  if (r.stav === "klasifikovan" && r.casMs !== null) return cistyCas(r.casMs);
  if (r.stav === "bez_casu") return bezi ? onCourse : "—";
  return STAV_LABEL[r.stav] ?? "—";
}

type Detail = { radek: VerejnyRadek; skupina: VerejnaSkupina };
type Tema = "dark" | "light";

/** Běžící čas závodu (od startu), tiká po 100 ms. null před startem. */
function useBezciCas(casStartuISO: string | null, bezi: boolean): string | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!bezi || !casStartuISO) return;
    const i = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(i);
  }, [bezi, casStartuISO]);
  if (!casStartuISO || now === null) return null;
  return uplynulyCas(now - new Date(casStartuISO).getTime());
}

/** Perzistentní vzhled výsledků (tmavá tabule / světlý protokol). */
function useTema(): [Tema, (t: Tema) => void] {
  const [tema, setTema] = useState<Tema>("dark");
  useEffect(() => {
    const ul = localStorage.getItem("casomir-vysledky-tema");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ul === "light" || ul === "dark") setTema(ul);
  }, []);
  const set = (t: Tema) => {
    setTema(t);
    localStorage.setItem("casomir-vysledky-tema", t);
  };
  return [tema, set];
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

export function VerejnaAkce({
  slug,
  initial,
  turnstileSiteKey,
}: {
  slug: string;
  initial: VerejnaData;
  turnstileSiteKey: string | null;
}) {
  const [data, setData] = useState<VerejnaData>(initial);
  const [tab, setTab] = useState<"vysledky" | "startovka">("vysledky");
  const [rozsah, setRozsah] = useState<"kategorie" | "celkova">("kategorie");
  const [zive, setZive] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [prihlaskaOpen, setPrihlaskaOpen] = useState(false);
  const t = useTranslations("results");
  const tp = useTranslations("prihlaska");
  const [tema, setTema] = useTema();
  const clock = useBezciCas(data.akce.casStartu, data.akce.bezi);

  // Nový finišer → krátké zvýraznění řádku (slideFlash). Ref seedneme počáteční
  // množinou, ať se při načtení nerozblikají všichni.
  const klasIds = (dd: VerejnaData) =>
    new Set(
      dd.vysledky.celkova.radky
        .filter((r) => r.stav === "klasifikovan")
        .map((r) => r.id),
    );
  const prevKlasRef = useRef<Set<string>>(klasIds(initial));
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const nyni = klasIds(data);
    const novi = new Set<string>();
    for (const id of nyni) if (!prevKlasRef.current.has(id)) novi.add(id);
    prevKlasRef.current = nyni;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (novi.size) setFlashIds(novi);
  }, [data]);

  // Polling à 5 s, jen když akce běží a NENÍ uzavřená (oficiální = statické).
  useEffect(() => {
    if (!data.akce.bezi || data.akce.uzavreno) return;
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
  }, [slug, data.akce.bezi, data.akce.uzavreno]);

  const a = data.akce;
  const d = new Date(a.datum + "T00:00:00");
  const datumText = `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
  const dobehlo = data.vysledky.celkova.klasifikovano;
  const naTrati = data.vysledky.celkova.radky.filter(
    (r) => r.stav === "bez_casu",
  ).length;
  const uzavreno = a.uzavreno;
  const vitez = data.vysledky.celkova.radky.find(
    (r) => r.stav === "klasifikovan" && r.casMs != null,
  );
  const vitezniCas = vitez?.casMs != null ? cistyCas(vitez.casMs) : "—";
  const nesklasifikovani = data.vysledky.celkova.radky.filter(
    (r) => r.stav === "DNF" || r.stav === "DNS" || r.stav === "DSQ",
  );
  const razitko = a.uzavrenoAt ? new Date(a.uzavrenoAt) : null;
  const razitkoText = razitko
    ? `${razitko.getDate()}. ${razitko.getMonth() + 1}. ${razitko.getFullYear()} ${String(razitko.getHours()).padStart(2, "0")}:${String(razitko.getMinutes()).padStart(2, "0")}`
    : "";

  return (
    <div
      data-vysledky-tema={tema}
      className="min-h-screen"
      style={{ background: "var(--p-bg)", color: "var(--p-txt)" }}
    >
      <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:max-w-5xl">
        {/* ===== Hlavička — světelná tabule ===== */}
        <header
          className={tema === "dark" ? "cal-dots-dark rounded-[16px] px-5 py-5" : "rounded-[16px] px-5 py-5"}
          style={{
            background: tema === "dark" ? "#101317" : "var(--ink-50)",
            border: `1px solid var(--p-line)`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1
                className="font-display text-2xl font-bold leading-tight"
                style={{ color: "var(--p-txt)" }}
              >
                {a.nazev}
              </h1>
              <p
                className="mt-1 font-technical text-[12px]"
                style={{ color: "var(--p-mut)" }}
              >
                {datumText}
                {a.misto ? ` · ${a.misto}` : ""}
              </p>
            </div>
            <StavPill bezi={a.bezi} zive={zive} uzavreno={uzavreno} />
          </div>

          {/* Dominantní čas (běžící / vítězný) + metriky */}
          {(a.bezi || uzavreno) && (
            <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <div className="cal-eyebrow" style={{ color: "var(--p-mut)" }}>
                  {uzavreno ? t("winningTime") : t("raceTime")}
                </div>
                <div
                  className="font-technical font-bold tabular-nums"
                  style={{
                    fontSize: 38,
                    lineHeight: 1,
                    color: "var(--p-clock)",
                    textShadow: uzavreno ? "none" : "var(--p-glow)",
                  }}
                >
                  {uzavreno ? vitezniCas : (clock ?? "0:00.0")}
                </div>
              </div>
              <Metrika label={t("finished")} hodnota={dobehlo} />
              <Metrika
                label={uzavreno ? t("notClassifiedTitle") : t("onCourseMetric")}
                hodnota={uzavreno ? nesklasifikovani.length : naTrati}
              />
            </div>
          )}

          {a.registraceOtevrena && (
            <Btn
              onClick={() => setPrihlaskaOpen(true)}
              className="mt-4 w-full sm:w-auto"
            >
              {tp("signUp")}
              {a.startovne ? ` · ${a.startovne} Kč` : ""}
            </Btn>
          )}
        </header>

        {/* ===== Přepínače: obsah + rozsah + vzhled/jazyk ===== */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SegmentedToggle
            key={tab}
            defaultValue={tab}
            onChange={(v) => setTab(v as typeof tab)}
            options={[
              { value: "vysledky", label: t("tabResults") },
              { value: "startovka", label: t("tabStartlist") },
            ]}
          />
          <SegmentedToggle
            defaultValue={rozsah}
            onChange={(v) => setRozsah(v as typeof rozsah)}
            options={[
              { value: "kategorie", label: t("scopeByCategory") },
              { value: "celkova", label: t("scopeOverall") },
            ]}
          />
          <div className="ml-auto flex items-center gap-2">
            <SegmentedToggle
              key={tema}
              defaultValue={tema}
              onChange={(v) => setTema(v as Tema)}
              options={[
                { value: "dark", label: t("themeDark") },
                { value: "light", label: t("themeLight") },
              ]}
            />
            <LangToggle variant={tema === "dark" ? "dark" : "light"} />
          </div>
        </div>

        {a.bezi && (
          <p
            className="mt-3 font-technical text-[11px]"
            style={{ color: "var(--p-mut)" }}
          >
            {t("updated", { cas: casDneKratky(a.aktualizovano) })}
          </p>
        )}

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
              flashIds={flashIds}
              onDetail={setDetail}
            />
          ) : data.vysledky.kategorie.length === 0 ? (
            <Prazdno text={t("noResults")} />
          ) : (
            data.vysledky.kategorie.map((sk) => (
              <VysledkySkupina
                key={sk.kod ?? sk.nazev}
                skupina={sk}
                bezi={a.bezi}
                flashIds={flashIds}
                onDetail={setDetail}
              />
            ))
          )
        ) : rozsah === "celkova" ? (
          <StartTabulka zavodnici={data.startovni.celkova} sKategorii />
        ) : data.startovni.kategorie.length === 0 ? (
          <Prazdno text={t("noStarters")} />
        ) : (
          data.startovni.kategorie.map((k) => (
            <section key={k.kod ?? k.nazev} className="mb-6">
              <KategorieHlavicka kod={k.kod} nazev={k.nazev} />
              <StartTabulka zavodnici={k.zavodnici} />
            </section>
          ))
        )}
      </div>

        {/* Oficiální výsledky — tisk + nesklasifikováno */}
        {uzavreno && tab === "vysledky" && (
          <div className="mt-6 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="cal-press rounded-full px-4 py-2 text-sm font-semibold"
              style={{ background: "var(--teal-500)", color: "#fff" }}
            >
              {t("downloadPdf")}
            </button>
            {nesklasifikovani.length > 0 && (
              <section className="mt-6">
                <KategorieHlavicka kod={null} nazev={t("notClassifiedTitle")} />
                <div>
                  {nesklasifikovani.map((r) => (
                    <VysledekRadek
                      key={r.id}
                      r={r}
                      bezi={false}
                      onClick={() =>
                        setDetail({ radek: r, skupina: data.vysledky.celkova })
                      }
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <footer
          className="mt-10 flex flex-col items-center gap-1.5 text-center font-technical text-[11px]"
          style={{ color: "var(--p-mut)" }}
        >
          {uzavreno && (
            <span
              className="font-semibold uppercase tracking-[.06em]"
              style={{ color: "var(--p-tkl)" }}
            >
              ✓ {t("confirmedBy", { datum: razitkoText })}
            </span>
          )}
          <span>{t("poweredResults")}</span>
          <PoweredBy variant={tema === "dark" ? "dark" : "light"} />
        </footer>

        <DetailDialog
          detail={detail}
          celkova={data.vysledky.celkova}
          bezi={a.bezi}
          onClose={() => setDetail(null)}
        />

        <PrihlaskaDialog
          slug={slug}
          open={prihlaskaOpen}
          startovne={a.startovne}
          turnstileSiteKey={turnstileSiteKey}
          onClose={() => setPrihlaskaOpen(false)}
        />
      </main>
    </div>
  );
}

/* ---------- Přihláška na závod ---------- */

function PrihlaskaDialog({
  slug,
  open,
  startovne,
  turnstileSiteKey,
  onClose,
}: {
  slug: string;
  open: boolean;
  startovne: number | null;
  turnstileSiteKey: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("prihlaska");
  const [state, formAction, pending] = useActionState<PrihlaskaState, FormData>(
    prihlasitSeNaAkci.bind(null, slug),
    { stav: "idle" },
  );
  // Časová past — čas otevření formuláře (do skrytého pole `ts`).
  const [otevreno, setOtevreno] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setOtevreno(Date.now());
  }, [open]);

  // Turnstile widget (jen když je nakonfigurovaný site key).
  useEffect(() => {
    if (!turnstileSiteKey || !open) return;
    let widgetId: string | undefined;
    let iv: ReturnType<typeof setInterval> | undefined;
    const render = () => {
      const el = widgetRef.current;
      if (window.turnstile && el && el.childElementCount === 0) {
        widgetId = window.turnstile.render(el, {
          sitekey: turnstileSiteKey,
          callback: (tok: string) => setTurnstileToken(tok),
          "error-callback": () => setTurnstileToken(""),
          "expired-callback": () => setTurnstileToken(""),
        });
      }
    };
    if (window.turnstile) render();
    else {
      const id = "cf-turnstile-script";
      if (!document.getElementById(id)) {
        const s = document.createElement("script");
        s.id = id;
        s.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true;
        s.onload = render;
        document.head.appendChild(s);
      } else {
        iv = setInterval(() => {
          if (window.turnstile) {
            clearInterval(iv);
            render();
          }
        }, 200);
      }
    }
    return () => {
      if (iv) clearInterval(iv);
      if (window.turnstile && widgetId) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          /* ignore */
        }
      }
    };
  }, [turnstileSiteKey, open]);

  return (
    <Dialog open={open} onClose={onClose}>
      {state.stav === "ok" ? (
        <div className="text-center">
          <div className="cal-dots-dark -mx-5 -mt-4 rounded-t-[22px] bg-ink-950 px-6 py-6 text-white">
            <div className="cal-eyebrow text-teal-300">{t("thanksTitle")}</div>
            <div className="mt-1 font-display text-xl font-bold">
              {t("thanksSub")}
            </div>
          </div>

          {state.qrDataUri ? (
            <div className="mt-5">
              <p className="text-sm text-ink-600">{t("payPrompt")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.qrDataUri}
                alt="QR"
                className="mx-auto mt-4 h-48 w-48"
              />
              <div className="mx-auto mt-4 max-w-xs divide-y divide-ink-150 text-left">
                {state.castka != null && (
                  <RadekDetailu label={t("amount")} hodnota={`${state.castka} Kč`} />
                )}
                <RadekDetailu label={t("vs")} hodnota={state.vs} />
                {state.ucet && <RadekDetailu label={t("account")} hodnota={state.ucet} />}
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-ink-600">
              {startovne ? t("contactOrganizer") : t("seeYou")}
            </p>
          )}

          <Btn variant="ghost" className="mt-6 w-full" onClick={onClose}>
            {t("close")}
          </Btn>
        </div>
      ) : (
        <form action={formAction}>
          <div className="cal-dots-dark -mx-5 -mt-4 rounded-t-[22px] bg-ink-950 px-6 py-6 text-center text-white">
            <div className="cal-eyebrow text-teal-300">{t("title")}</div>
            <div className="mt-1 font-display text-xl font-bold">
              {t("fillIn")}
            </div>
            {startovne ? (
              <div className="mt-2 font-technical text-[12px] text-ink-300">
                {t("fee", { castka: startovne })}
              </div>
            ) : null}
          </div>

          {/* Honeypot proti botům — skryté, lidé nevyplní. */}
          <input
            type="text"
            name="web"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />
          {/* Časová past — čas otevření formuláře. */}
          <input type="hidden" name="ts" value={otevreno} />

          <div className="mt-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="cal-label">
                {t("firstName")}
                <input name="jmeno" autoComplete="given-name" className="cal-input" />
              </label>
              <label className="cal-label">
                {t("lastName")} *
                <input
                  name="prijmeni"
                  required
                  autoComplete="family-name"
                  className="cal-input"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="cal-label">
                {t("year")}
                <input
                  type="number"
                  name="rokNarozeni"
                  inputMode="numeric"
                  placeholder="1990"
                  className="cal-input"
                />
              </label>
              <label className="cal-label">
                {t("clubTown")}
                <input name="oddil" className="cal-input" />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="cal-label">
                {t("phone")}
                <input
                  type="tel"
                  name="telefon"
                  autoComplete="tel"
                  className="cal-input"
                />
              </label>
              <label className="cal-label">
                {t("email")}
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  className="cal-input"
                />
              </label>
            </div>

            {/* Cloudflare Turnstile (jen když je nakonfigurováno). */}
            {turnstileSiteKey && (
              <div ref={widgetRef} className="flex justify-center" />
            )}

            {state.stav === "chyba" && (
              <p className="rounded-[10px] bg-error-bg px-3 py-2 text-sm font-medium text-error">
                {state.zprava}
              </p>
            )}

            <Btn
              type="submit"
              disabled={pending || (!!turnstileSiteKey && !turnstileToken)}
              className="mt-1 w-full"
            >
              {pending ? t("submitting") : t("submit")}
            </Btn>
            <p className="text-center text-[11px] text-ink-400">
              {t("privacy")}
            </p>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/* ---------- Živá plaketa ---------- */

function Metrika({ label, hodnota }: { label: string; hodnota: number }) {
  return (
    <div>
      <div className="cal-eyebrow" style={{ color: "var(--p-mut)" }}>
        {label}
      </div>
      <div
        className="font-technical font-bold tabular-nums"
        style={{ fontSize: 26, lineHeight: 1, color: "var(--p-txt)" }}
      >
        {hodnota}
      </div>
    </div>
  );
}

function StavPill({
  bezi,
  zive,
  uzavreno,
}: {
  bezi: boolean;
  zive: boolean;
  uzavreno?: boolean;
}) {
  const t = useTranslations("results");
  const base =
    "flex-none inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-technical text-[10.5px] font-semibold uppercase tracking-[.06em]";
  if (uzavreno) {
    return (
      <span
        className={base}
        style={{
          background: "var(--p-ofbg)",
          border: "1px solid var(--p-ofb)",
          color: "var(--p-offg)",
        }}
      >
        <span style={{ color: "var(--teal-400)" }}>✓</span>
        {t("officialResults")}
      </span>
    );
  }
  if (!bezi) {
    return (
      <span
        className={base}
        style={{
          background: "var(--p-ofbg)",
          border: "1px solid var(--p-ofb)",
          color: "var(--p-offg)",
        }}
      >
        {t("beforeStart")}
      </span>
    );
  }
  if (!zive) {
    return (
      <span
        className={base}
        style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
      >
        {t("offline")}
      </span>
    );
  }
  return (
    <span
      className={base}
      style={{
        background: "var(--p-lvbg)",
        border: "1px solid var(--p-lvb)",
        color: "var(--p-lvfg)",
      }}
    >
      <span
        className="cal-livedot h-1.5 w-1.5 rounded-full"
        style={{ background: "var(--p-lvfg)" }}
      />
      {t("live")}
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
  const t = useTranslations("results");
  return (
    <Card className="cal-dots flex flex-col items-center px-6 py-14 text-center">
      <h2 className="font-display text-xl font-bold text-ink-900">
        {t("raceNotStarted")}
      </h2>
      <p className="mt-2 font-technical text-[13px] text-ink-500">{datumText}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">
        {t("resultsWhenTiming")}
      </p>
      <Btn className="mt-6" onClick={onStartovka}>
        {t("showStartlist")}
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
    <div
      className="mb-2 flex items-baseline gap-2 pb-1.5"
      style={{ borderBottom: "1px solid var(--p-line)" }}
    >
      {kod && (
        <span className="font-technical font-bold" style={{ color: "var(--p-tkl)" }}>
          {kod}
        </span>
      )}
      <span className="font-medium" style={{ color: "var(--p-txt)" }}>
        {nazev}
      </span>
      {souhrn && (
        <span
          className="ml-auto flex-none font-technical text-[11px]"
          style={{ color: "var(--p-mut)" }}
        >
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
  flashIds,
  onDetail,
}: {
  skupina: VerejnaSkupina;
  bezi: boolean;
  celkova?: boolean;
  flashIds?: Set<string>;
  onDetail: (d: Detail) => void;
}) {
  const t = useTranslations("results");
  const listRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<Map<string, number>>(new Map());
  const poradiKlic = skupina.radky.map((r) => r.id).join(",");

  // FLIP — plynulý posun řádků při změně pořadí (jen když se pořadí změní).
  useLayoutEffect(() => {
    const cont = listRef.current;
    if (!cont) return;
    const prev = posRef.current;
    const nova = new Map<string, number>();
    cont.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((el) => {
      const id = el.dataset.flipId!;
      const top = el.getBoundingClientRect().top;
      nova.set(id, top);
      const stary = prev.get(id);
      if (stary != null && stary !== top) {
        el.style.transform = `translateY(${stary - top}px)`;
        el.style.transition = "transform 0s";
        requestAnimationFrame(() => {
          el.style.transition = "transform .4s cubic-bezier(.16,1,.3,1)";
          el.style.transform = "";
        });
      }
    });
    posRef.current = nova;
  }, [poradiKlic]);

  if (skupina.radky.length === 0) return null;
  const souhrn =
    t("classifiedShort", { n: skupina.klasifikovano }) +
    (skupina.dnf ? ` · ${t("dnfShort", { n: skupina.dnf })}` : "");
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
      <div
        className="hidden items-center gap-4 pb-1.5 font-technical text-[11px] uppercase tracking-[.06em] lg:flex"
        style={{ color: "var(--p-mut)", borderBottom: "1px solid var(--p-line)" }}
      >
        <span className="w-[30px] flex-none text-center">{t("colPos")}</span>
        <span className="w-[40px] flex-none">{t("colBib")}</span>
        <span className="min-w-0 flex-[2]">{t("colName")}</span>
        <span className="w-[64px] flex-none">{t("colYear")}</span>
        <span className="min-w-0 flex-1">{t("colClub")}</span>
        <span className="w-[84px] flex-none text-right">{t("colTime")}</span>
        <span className="w-[90px] flex-none text-right">{t("colGap")}</span>
      </div>
      <div ref={listRef}>
        {skupina.radky.map((r) => (
          <VysledekRadek
            key={r.id}
            r={r}
            bezi={bezi}
            flash={flashIds?.has(r.id)}
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
  flash,
  onClick,
}: {
  r: VerejnyRadek;
  bezi: boolean;
  flash?: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("results");
  const nedobehl = r.stav !== "klasifikovan";
  const topRank = !!r.poradi && r.poradi <= 3;
  return (
    <button
      type="button"
      data-flip-id={r.id}
      onClick={onClick}
      className={`cal-press flex w-full items-center gap-3 py-2.5 text-left lg:gap-4 ${flash ? "pub-flash" : ""}`}
      style={{ borderTop: "1px solid var(--p-line)" }}
    >
      <span
        className="flex w-[30px] flex-none justify-center font-technical text-[15px] font-bold tabular-nums"
        style={{ color: topRank ? "var(--p-rhi)" : "var(--p-rlo)" }}
      >
        {r.poradi ?? "—"}
      </span>
      {/* startovní číslo jako plotýnka */}
      <span
        className="flex-none rounded-[6px] px-1.5 py-0.5 font-technical text-[13px] font-bold tabular-nums"
        style={{
          background: "var(--p-plbg)",
          color: "var(--p-plfg)",
          border: "var(--p-plb)",
          minWidth: 30,
          textAlign: "center",
        }}
      >
        {r.cislo ?? "—"}
      </span>
      <span className="min-w-0 flex-1 lg:flex-[2]">
        <span
          className="block truncate font-medium"
          style={{ color: nedobehl ? "var(--p-mut)" : "var(--p-txt)" }}
        >
          {r.prijmeni} {r.jmeno}
        </span>
        <span
          className="block truncate font-technical text-[11px] lg:hidden"
          style={{ color: "var(--p-mut)" }}
        >
          {r.oddil || ""}
        </span>
      </span>
      {/* ročník — jen desktop */}
      <span
        className="hidden w-[64px] flex-none font-technical text-[14px] tabular-nums lg:block"
        style={{ color: "var(--p-mut)" }}
      >
        {r.rocnik ?? "—"}
      </span>
      {/* oddíl — jen desktop */}
      <span
        className="hidden min-w-0 flex-1 truncate font-technical text-[14px] lg:block"
        style={{ color: "var(--p-mut)" }}
      >
        {r.oddil || "—"}
      </span>
      <span className="flex-none text-right lg:w-[84px]">
        <span
          className="block font-technical font-semibold tabular-nums"
          style={{ color: nedobehl ? "var(--p-mut)" : "var(--p-time)" }}
        >
          {casBunka(r, bezi, t("onCourse"))}
        </span>
        {r.stav === "klasifikovan" && (
          <span
            className="block font-technical text-[11px] tabular-nums lg:hidden"
            style={{ color: "var(--p-mut)" }}
          >
            {ztrata(r.ztrataMs)}
          </span>
        )}
      </span>
      <span
        className="hidden w-[90px] flex-none text-right font-technical text-[14px] tabular-nums lg:block"
        style={{ color: "var(--p-mut)" }}
      >
        {r.stav === "klasifikovan" ? ztrata(r.ztrataMs) : "—"}
      </span>
    </button>
  );
}

/* ---------- Detail závodníka (sdílitelná karta) ---------- */

interface HistorieItem {
  rok: number;
  akceNazev: string;
  kategorie: string | null;
  poradi: number | null;
  casMs: number;
}

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
  const t = useTranslations("results");
  const ta = useTranslations("athlete");
  const r = detail?.radek;
  const skupina = detail?.skupina;
  const celkovePoradi =
    r && celkova.radky.find((x) => x.id === r.id)?.poradi;
  const url = typeof window !== "undefined" ? window.location.href : "";

  // Historické výsledky (lazy-fetch při otevření detailu; shoda dle jména + roku).
  const [historie, setHistorie] = useState<HistorieItem[] | null>(null);
  const osobaId = r?.id;
  useEffect(() => {
    if (!r) return;
    let zruseno = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistorie(null);
    const q = new URLSearchParams({ p: r.prijmeni, j: r.jmeno });
    if (r.rocnik != null) q.set("r", String(r.rocnik));
    fetch(`/api/historie?${q.toString()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: HistorieItem[]) => {
        if (!zruseno) setHistorie(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!zruseno) setHistorie([]);
      });
    return () => {
      zruseno = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osobaId]);

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
              {casBunka(r, bezi, t("onCourse"))}
            </div>
          </div>

          {/* Světlé tělo — umístění + detaily */}
          <div className="mt-5 divide-y divide-ink-150">
            <RadekDetailu
              label={ta("inCategory")}
              hodnota={
                r.stav === "klasifikovan" && r.poradi
                  ? ta("ofN", { poradi: r.poradi, celkem: skupina.klasifikovano })
                  : STAV_LABEL[r.stav] ?? "—"
              }
            />
            <RadekDetailu
              label={ta("overall")}
              hodnota={
                celkovePoradi
                  ? ta("ofN", { poradi: celkovePoradi, celkem: celkova.klasifikovano })
                  : "—"
              }
            />
            <RadekDetailu
              label={ta("gap")}
              hodnota={r.stav === "klasifikovan" ? ztrata(r.ztrataMs) : "—"}
            />
            <RadekDetailu label={ta("clubCity")} hodnota={r.oddil || "—"} />
          </div>

          {historie && historie.length > 0 && (
            <div className="mt-5">
              <div className="cal-eyebrow mb-2 text-ink-400">
                {ta("history")}
              </div>
              <div className="divide-y divide-ink-150 overflow-hidden rounded-[10px] border border-ink-150">
                {historie.map((h, i) => (
                  <div
                    key={`${h.rok}-${i}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="font-technical tabular-nums text-ink-500">
                      {h.rok}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink-600">
                      {h.akceNazev}
                    </span>
                    <span className="flex-none font-technical font-semibold tabular-nums text-ink-900">
                      {cistyCas(h.casMs)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {url && (
            <div className="mt-5 rounded-[10px] bg-ink-50 px-3 py-2.5">
              <div className="cal-eyebrow text-ink-400">{ta("share")}</div>
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
  const t = useTranslations("results");
  return (
    <div className="mb-4">
      {zavodnici.map((z) => (
        <div
          key={z.id}
          className="flex items-center gap-3 py-2.5 lg:gap-4"
          style={{ borderTop: "1px solid var(--p-line)" }}
        >
          <span
            className="flex-none rounded-[6px] px-1.5 py-0.5 text-center font-technical text-[13px] font-bold tabular-nums"
            style={{
              background: "var(--p-plbg)",
              color: "var(--p-plfg)",
              border: "var(--p-plb)",
              minWidth: 30,
            }}
          >
            {z.cislo ?? "—"}
          </span>
          <span className="min-w-0 flex-1 lg:flex-[2]">
            <span className="block truncate font-medium" style={{ color: "var(--p-txt)" }}>
              {z.prijmeni} {z.jmeno}
            </span>
            <span
              className="block truncate font-technical text-[11px] lg:hidden"
              style={{ color: "var(--p-mut)" }}
            >
              {z.rocnik ? `${t("yearAbbrev")} ${z.rocnik}` : ""}
              {z.rocnik && z.oddil ? " · " : ""}
              {z.oddil || (z.rocnik ? "" : "—")}
            </span>
          </span>
          <span
            className="hidden w-[64px] flex-none font-technical text-[14px] tabular-nums lg:block"
            style={{ color: "var(--p-mut)" }}
          >
            {z.rocnik ?? "—"}
          </span>
          <span
            className="hidden min-w-0 flex-1 truncate font-technical text-[14px] lg:block"
            style={{ color: "var(--p-mut)" }}
          >
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
    <p
      className="py-12 text-center text-sm"
      style={{ color: "var(--p-mut)" }}
    >
      {text}
    </p>
  );
}
