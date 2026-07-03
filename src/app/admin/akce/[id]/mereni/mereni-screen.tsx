"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { casDneKratky, uplynulyCas } from "@/lib/cas";
import { useWakeLock } from "@/lib/wake-lock";
import {
  ulozPruchod,
  nactiProAkci,
  nactiDirty,
  oznacCisté,
  type OutboxPruchod,
} from "@/lib/outbox";
import { ulozitPruchody, nastavitStart } from "@/server/mereni";
import { spustSyncWorker } from "@/lib/mereni-sync";
import { PoweredBy } from "@/app/admin/_components/ui";

interface ZavodnikInfo {
  startovniCislo: number | null;
  jmeno: string;
  prijmeni: string;
}

/**
 * Měřicí (cílová) obrazovka — Calderon redesign, směr „Číselník" (Direction B).
 * Hrdina je mřížka startovních čísel; ťuknutím se zaznamená průchod a dlaždice
 * zezelená s časem doběhu. Vlevo živá fronta „k doplnění" a poslední průchody.
 * Datový model, offline outbox a sync zůstávají beze změny — měníme jen UI.
 */
interface BodInfo {
  id: string;
  nazev: string;
  jeCil: boolean;
}

export function MereniScreen({
  akceId,
  nazev,
  casStartu: casStartuProp,
  zavodnici,
  pocatecniZaznamy,
  body = [],
}: {
  akceId: string;
  nazev: string;
  casStartu: string | null;
  zavodnici: ZavodnikInfo[];
  pocatecniZaznamy: OutboxPruchod[];
  body?: BodInfo[];
}) {
  const [zaznamy, setZaznamy] = useState<OutboxPruchod[]>(pocatecniZaznamy);
  const [inlineCislo, setInlineCislo] = useState("");
  const [rezim, setRezim] = useState<"tlacitko" | "ciselnik">("ciselnik");
  const [filtr, setFiltr] = useState("");
  // Aktivní měřicí bod (brána), do kterého se zaznamenávají průchody.
  // Default = cílová brána; akce bez bran → null (klasický cíl).
  const [aktivniBod, setAktivniBod] = useState<string | null>(
    () => body.find((b) => b.jeCil)?.id ?? body[0]?.id ?? null,
  );
  const [casStartu, setCasStartu] = useState<string | null>(casStartuProp);
  const [online, setOnline] = useState(true);
  const [nowMs, setNowMs] = useState<number | null>(null);
  // Pokus o záznam bez odstartované akce → upozornění.
  const [chybaBezStartu, setChybaBezStartu] = useState(false);
  // Čas poslední lokální zálohy (z background workeru).
  const [posledniZaloha, setPosledniZaloha] = useState<number | null>(null);
  const poradiRef = useRef(
    Math.max(0, ...pocatecniZaznamy.map((z) => z.poradiDoteku)),
  );
  const { drzi: wakeDrzi, podporovano: wakePodporovano } = useWakeLock(true);

  const zavodniciMap = useMemo(() => {
    const m = new Map<number, ZavodnikInfo>();
    for (const z of zavodnici) {
      if (z.startovniCislo !== null) m.set(z.startovniCislo, z);
    }
    return m;
  }, [zavodnici]);

  // --- synchronizace dirty průchodů na server (idempotentní, opakovatelná) ---
  const sync = useCallback(async () => {
    let dirty: OutboxPruchod[];
    try {
      dirty = await nactiDirty(akceId);
    } catch {
      return;
    }
    if (dirty.length === 0) return;
    try {
      const res = await ulozitPruchody(
        akceId,
        dirty.map((p) => ({
          clientId: p.clientId,
          casCile: p.casCile,
          startovniCislo: p.startovniCislo,
          stav: p.stav,
          poradiDoteku: p.poradiDoteku,
          bodId: p.bodId ?? null,
        })),
      );
      const potvrzene = res.map((r) => r.clientId);
      await oznacCisté(potvrzene);
      setOnline(true);
      setZaznamy((prev) =>
        prev.map((z) =>
          potvrzene.includes(z.clientId) ? { ...z, dirty: false } : z,
        ),
      );
    } catch {
      setOnline(false);
    }
  }, [akceId]);

  // Načti lokální outbox (replay) a slij s daty ze serveru; pak zkus sync.
  useEffect(() => {
    let zruseno = false;
    (async () => {
      try {
        const lokalni = await nactiProAkci(akceId);
        if (zruseno) return;
        if (lokalni.length > 0) {
          setZaznamy((prev) => {
            const map = new Map(prev.map((z) => [z.clientId, z]));
            for (const l of lokalni) map.set(l.clientId, l); // lokální verze má přednost
            const slite = [...map.values()];
            poradiRef.current = Math.max(
              poradiRef.current,
              ...slite.map((z) => z.poradiDoteku),
            );
            return slite;
          });
        }
      } catch {
        /* IndexedDB nedostupné — jedeme jen přes server */
      }
      sync();
    })();
    return () => {
      zruseno = true;
    };
  }, [akceId, sync]);

  // Periodický sync + reakce na online/offline.
  useEffect(() => {
    const i = setInterval(sync, 5000);
    const onOnline = () => {
      setOnline(true);
      sync();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const raf = requestAnimationFrame(() => setOnline(navigator.onLine));
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(i);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [sync]);

  // Background sync worker — běží dál i po odchodu z obrazovky (odskok do menu).
  // Worker se NETERMINUJE (singleton přežívá navigaci); jen odpojíme posluchače.
  useEffect(() => {
    const w = spustSyncWorker(akceId);
    if (!w) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; clientIds?: string[]; kdy?: number };
      if (d?.type === "synced" && d.clientIds?.length) {
        const ids = new Set(d.clientIds);
        setOnline(true);
        setZaznamy((prev) =>
          prev.map((z) => (ids.has(z.clientId) ? { ...z, dirty: false } : z)),
        );
      }
      if (d?.type === "zaloha" && d.kdy) setPosledniZaloha(d.kdy);
    };
    w.addEventListener("message", onMsg);
    return () => w.removeEventListener("message", onMsg);
  }, [akceId]);

  // Živé hodiny — tikají po 100 ms; klient-only (deterministické SSR z null).
  useEffect(() => {
    const raf = requestAnimationFrame(() => setNowMs(Date.now()));
    const i = setInterval(() => setNowMs(Date.now()), 100);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(i);
    };
  }, []);

  // --- zaznamenání průchodu (kritická cesta: stav → IndexedDB → server) ---
  // Jádro sdílené velkým tlačítkem i číselníkem. Razítko vzniká v okamžiku volání.
  const pridejPruchod = useCallback(
    async (platneCislo: number | null) => {
      // Bez odstartované akce nelze měřit (čistý čas by neměl smysl).
      if (!casStartu) {
        setChybaBezStartu(true);
        return;
      }
      const cas = new Date(); // wall-clock, ms (NIKDY performance.now)
      poradiRef.current += 1;
      const p: OutboxPruchod = {
        clientId: crypto.randomUUID(),
        akceId,
        casCile: cas.toISOString(),
        startovniCislo: platneCislo,
        stav: platneCislo !== null ? "platny" : "neprirazeno",
        poradiDoteku: poradiRef.current,
        bodId: body.length > 0 ? aktivniBod : null,
        dirty: true,
      };
      setZaznamy((prev) => [p, ...prev]); // optimisticky, okamžitě
      try {
        await ulozPruchod(p); // pojistka dřív než server
      } catch {
        /* i bez IndexedDB pokračujeme – záznam je ve stavu a půjde na server */
      }
      sync();
    },
    [akceId, sync, aktivniBod, body.length, casStartu],
  );

  const zaznamenat = useCallback(async () => {
    const cisloStr = inlineCislo.trim();
    const cislo = cisloStr ? parseInt(cisloStr.replace(/\D/g, ""), 10) : null;
    const platneCislo = cislo !== null && Number.isFinite(cislo) ? cislo : null;
    setInlineCislo("");
    await pridejPruchod(platneCislo);
  }, [inlineCislo, pridejPruchod]);

  // Mezerník = zaznamenat průchod (jen v režimu velkého tlačítka; ignoruj psaní do inputu).
  useEffect(() => {
    if (rezim !== "tlacitko") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
        return;
      if (e.repeat) return;
      e.preventDefault();
      zaznamenat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rezim, zaznamenat]);

  const upravZaznam = useCallback(
    async (clientId: string, zmena: Partial<OutboxPruchod>) => {
      let novy: OutboxPruchod | null = null;
      setZaznamy((prev) =>
        prev.map((z) => {
          if (z.clientId !== clientId) return z;
          novy = { ...z, ...zmena, dirty: true };
          return novy;
        }),
      );
      if (novy) {
        try {
          await ulozPruchod(novy);
        } catch {
          /* ignore */
        }
        sync();
      }
    },
    [sync],
  );

  const priraditCislo = useCallback(
    (clientId: string, cisloStr: string) => {
      const cislo = parseInt(cisloStr.replace(/\D/g, ""), 10);
      const platne = Number.isFinite(cislo) ? cislo : null;
      upravZaznam(clientId, {
        startovniCislo: platne,
        stav: platne !== null ? "platny" : "neprirazeno",
      });
    },
    [upravZaznam],
  );

  async function start() {
    const iso = new Date().toISOString();
    setCasStartu(iso);
    setChybaBezStartu(false);
    await nastavitStart(akceId, iso);
  }
  async function zrusitStart() {
    setCasStartu(null);
    await nastavitStart(akceId, null);
  }

  // --- odvozené ---
  const startMs = casStartu ? new Date(casStartu).getTime() : null;

  const viditelne = useMemo(
    () =>
      [...zaznamy]
        .filter((z) => z.stav !== "smazany")
        .sort((a, b) => b.poradiDoteku - a.poradiDoteku),
    [zaznamy],
  );

  // Fronta „k doplnění" — průchody bez čísla (nejnovější nahoře).
  const kDoplneni = useMemo(
    () => viditelne.filter((z) => z.startovniCislo === null),
    [viditelne],
  );
  // Poslední přiřazené průchody (pro pravidelný náhled v levém railu).
  const posledni = useMemo(
    () => viditelne.filter((z) => z.startovniCislo !== null).slice(0, 40),
    [viditelne],
  );
  const dirtyPocet = zaznamy.filter((z) => z.dirty).length;

  // Použitá čísla: počet průchodů a čas posledního podle startovního čísla.
  const cislaInfo = useMemo(() => {
    const m = new Map<number, { pocet: number; posledniMs: number }>();
    for (const z of zaznamy) {
      if (z.stav === "smazany" || z.startovniCislo === null) continue;
      const cas = new Date(z.casCile).getTime();
      const ex = m.get(z.startovniCislo);
      if (ex) {
        ex.pocet += 1;
        ex.posledniMs = Math.max(ex.posledniMs, cas);
      } else {
        m.set(z.startovniCislo, { pocet: 1, posledniMs: cas });
      }
    }
    return m;
  }, [zaznamy]);

  // Mřížka startovních čísel (vzestupně), volitelně filtrovaná.
  const cislaZavodniku = useMemo(() => {
    const f = filtr.trim();
    return zavodnici
      .filter((z) => z.startovniCislo !== null)
      .filter((z) => (f ? String(z.startovniCislo).startsWith(f) : true))
      .sort((a, b) => (a.startovniCislo ?? 0) - (b.startovniCislo ?? 0));
  }, [zavodnici, filtr]);
  const dobehlo = cislaZavodniku.filter((z) =>
    cislaInfo.has(z.startovniCislo!),
  ).length;

  const clock =
    nowMs !== null && startMs !== null
      ? uplynulyCas(nowMs - startMs)
      : "00:00.0";

  return (
    <div
      className="cal-screen flex flex-col overflow-hidden rounded-[16px] border"
      style={{
        height: "min(82vh, 760px)",
        minHeight: 560,
        background: "var(--ink-50)",
        borderColor: "var(--ink-200)",
        boxShadow: "var(--shadow-md)",
        fontFamily: "var(--cal-font-sans)",
        color: "var(--ink-900)",
      }}
    >
      {/* ---------- Top bar ---------- */}
      <header
        className="flex flex-none items-center justify-between gap-3 px-4 sm:px-6"
        style={{
          height: 54,
          background: "rgba(248,250,249,.9)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--ink-200)",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/admin/akce/${akceId}`}
            title="Zpět do menu (měření běží dál na pozadí)"
            className="flex flex-none items-center gap-1 rounded-[8px] px-2 py-1.5"
            style={{
              border: "1px solid var(--ink-200)",
              background: "#fff",
              font: "600 12px var(--cal-font-sans)",
              color: "var(--ink-700)",
            }}
          >
            ← Menu
          </Link>
          <Image
            src="/calderon-logo.png"
            alt="Calderon"
            width={96}
            height={18}
            style={{ height: 18, width: "auto" }}
            priority
          />
          <span
            style={{ width: 1, height: 22, background: "var(--ink-200)" }}
          />
          <div className="min-w-0">
            <div
              style={{
                font: "500 10px/1 var(--cal-font-mono)",
                letterSpacing: ".14em",
                color: "var(--teal-600)",
              }}
            >
              CÍLOVÁ OBRAZOVKA
            </div>
            <div
              className="truncate"
              style={{
                font: "600 14px/1.25 var(--cal-font-sans)",
                color: "var(--ink-900)",
                marginTop: 3,
              }}
            >
              {nazev}
            </div>
          </div>
        </div>

        <div className="flex flex-none items-center gap-2 sm:gap-3">
          {/* Aktivní měřicí bod (jen když akce má brány) */}
          {body.length > 0 && (
            <select
              value={aktivniBod ?? ""}
              onChange={(e) => setAktivniBod(e.target.value || null)}
              title="Měřicí bod, do kterého se zaznamenává"
              style={{
                background: "var(--ink-900)",
                color: "var(--teal-300)",
                border: "1px solid var(--ink-700)",
                borderRadius: "var(--radius-md)",
                padding: "8px 10px",
                font: "600 12px var(--cal-font-mono)",
                letterSpacing: ".04em",
              }}
            >
              {body.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.jeCil ? "🏁 " : "• "}
                  {b.nazev}
                </option>
              ))}
            </select>
          )}

          {/* Živé hodiny */}
          <div
            className="flex items-baseline gap-2"
            style={{
              background: "var(--ink-950)",
              padding: "8px 14px",
              borderRadius: "var(--radius-md)",
            }}
          >
            <span
              className={startMs !== null ? "cal-livedot" : undefined}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background:
                  startMs !== null ? "var(--teal-400)" : "var(--ink-600)",
              }}
            />
            <span
              style={{
                font: "600 22px var(--cal-font-mono)",
                color: "var(--teal-300)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-.01em",
              }}
            >
              {clock}
            </span>
          </div>

          <StatusChip
            ok={online}
            okLabel="ONLINE"
            errLabel="OFFLINE"
          />
          <SyncChip dirty={dirtyPocet} />
          {wakePodporovano && (
            <span
              title={wakeDrzi ? "Obrazovka zůstává aktivní" : "Obrazovka neuzamčena"}
              className="hidden sm:inline-flex items-center"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: wakeDrzi ? "var(--teal-500)" : "var(--ink-300)",
              }}
            />
          )}
        </div>
      </header>

      {/* ---------- Body ---------- */}
      <div className="flex min-h-0 flex-1">
        {/* Levý rail */}
        <aside
          className="flex w-[296px] flex-none flex-col"
          style={{
            borderRight: "1px solid var(--ink-200)",
            background: "#fff",
          }}
        >
          {/* Start + přepínač režimu */}
          <div
            className="px-[18px] pb-[14px] pt-4"
            style={{ borderBottom: "1px solid var(--ink-150)" }}
          >
            {casStartu ? (
              <div
                className="flex items-center gap-2"
                style={{
                  font: "400 12px var(--cal-font-sans)",
                  color: "var(--ink-600)",
                }}
              >
                <span
                  className="cal-livedot"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--success)",
                  }}
                />
                Start akce
                <strong
                  className="ml-auto"
                  style={{
                    color: "var(--ink-900)",
                    fontFamily: "var(--cal-font-mono)",
                    fontWeight: 600,
                  }}
                >
                  {casDneKratky(casStartu)}
                </strong>
                <button
                  onClick={zrusitStart}
                  className="underline"
                  style={{ color: "var(--error)", fontSize: 11 }}
                >
                  zrušit
                </button>
              </div>
            ) : (
              <button
                onClick={start}
                className="cal-press w-full"
                style={{
                  background: "var(--teal-500)",
                  color: "#fff",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 0",
                  font: "700 15px var(--cal-font-sans)",
                  boxShadow: "var(--shadow-primary)",
                }}
              >
                ▶ START (hromadný)
              </button>
            )}

            {/* Přepínač režimu měření */}
            <div
              className="mt-[13px] flex gap-1"
              style={{
                background: "var(--ink-100)",
                padding: 4,
                borderRadius: "var(--radius-md)",
              }}
            >
              <RezimTab
                aktivni={rezim === "tlacitko"}
                onClick={() => setRezim("tlacitko")}
              >
                Velké tlačítko
              </RezimTab>
              <RezimTab
                aktivni={rezim === "ciselnik"}
                onClick={() => setRezim("ciselnik")}
              >
                Číselník
              </RezimTab>
            </div>
          </div>

          {/* K doplnění */}
          <div className="flex items-center justify-between px-[18px] pb-[10px] pt-4">
            <span
              style={{
                font: "500 10.5px var(--cal-font-mono)",
                letterSpacing: ".12em",
                color: "var(--amber-500)",
              }}
            >
              K DOPLNĚNÍ
            </span>
            <span
              style={{
                font: "600 11px var(--cal-font-mono)",
                color: "var(--ink-400)",
              }}
            >
              {kDoplneni.length}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-[14px] pb-[14px]">
            {kDoplneni.map((z) => (
              <QueueCard
                key={z.clientId}
                cisty={
                  startMs !== null
                    ? uplynulyCas(new Date(z.casCile).getTime() - startMs)
                    : casDneKratky(z.casCile)
                }
                wall={casDneKratky(z.casCile)}
                onAssign={(v) => priraditCislo(z.clientId, v)}
              />
            ))}

            <div
              style={{
                font: "500 10.5px var(--cal-font-mono)",
                letterSpacing: ".12em",
                color: "var(--ink-400)",
                margin: "14px 2px 8px",
              }}
            >
              POSLEDNÍ
            </div>
            {posledni.length === 0 ? (
              <p
                className="px-1 py-2"
                style={{ font: "400 12px var(--cal-font-sans)", color: "var(--ink-400)" }}
              >
                Zatím žádné průchody.
              </p>
            ) : (
              posledni.map((z) => {
                const zav =
                  z.startovniCislo !== null
                    ? zavodniciMap.get(z.startovniCislo)
                    : undefined;
                return (
                  <PosledniRadek
                    key={z.clientId}
                    cislo={z.startovniCislo}
                    jmeno={zav ? `${zav.prijmeni} ${zav.jmeno}` : "neznámé číslo"}
                    zname={!!zav}
                    cas={
                      startMs !== null
                        ? uplynulyCas(new Date(z.casCile).getTime() - startMs)
                        : casDneKratky(z.casCile)
                    }
                    onReassign={(v) => priraditCislo(z.clientId, v)}
                    onDelete={() =>
                      upravZaznam(z.clientId, { stav: "smazany" })
                    }
                  />
                );
              })
            )}
          </div>
        </aside>

        {/* Hlavní plocha */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!casStartu && (
            <div
              className="mx-5 mt-4 flex items-center gap-2 rounded-[10px] px-4 py-2.5"
              style={{
                background: chybaBezStartu ? "var(--error-bg)" : "var(--warning-bg)",
                color: chybaBezStartu ? "var(--error)" : "var(--warning)",
                font: "600 13px var(--cal-font-sans)",
              }}
            >
              {chybaBezStartu
                ? "Akce není odstartovaná — průchod nelze zaznamenat. Spusť START vlevo."
                : "Akce zatím není odstartovaná. Spusť START vlevo, pak měř."}
            </div>
          )}
          {rezim === "ciselnik" ? (
            <>
              <div className="flex items-center justify-between px-5 pb-3 pt-[15px]">
                <div
                  className="flex items-center gap-[9px]"
                  style={{
                    background: "#fff",
                    border: "1px solid var(--ink-200)",
                    borderRadius: "var(--radius-md)",
                    padding: "9px 12px",
                    width: 180,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--ink-300)",
                    }}
                  />
                  <input
                    value={filtr}
                    onChange={(e) => setFiltr(e.target.value)}
                    inputMode="numeric"
                    placeholder="filtr čísla…"
                    className="w-full bg-transparent outline-none"
                    style={{
                      font: "500 13px var(--cal-font-sans)",
                      color: "var(--ink-800)",
                    }}
                  />
                </div>
                <div
                  style={{
                    font: "500 11px var(--cal-font-mono)",
                    letterSpacing: ".06em",
                    color: "var(--ink-500)",
                  }}
                >
                  <strong style={{ color: "var(--teal-600)" }}>{dobehlo}</strong>
                  /{cislaZavodniku.length} DOBĚHLO
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-0.5">
                {cislaZavodniku.length === 0 ? (
                  <p
                    className="py-10 text-center"
                    style={{
                      font: "400 13px var(--cal-font-sans)",
                      color: "var(--ink-400)",
                    }}
                  >
                    Žádná startovní čísla (naimportuj závodníky).
                  </p>
                ) : (
                  <div
                    className="grid gap-[10px]"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fill,minmax(82px,1fr))",
                    }}
                  >
                    {cislaZavodniku.map((z) => {
                      const i = cislaInfo.get(z.startovniCislo!);
                      const done = !!i;
                      return (
                        <button
                          key={z.startovniCislo}
                          onClick={() => pridejPruchod(z.startovniCislo!)}
                          disabled={!casStartu}
                          className="cal-tile flex flex-col items-center justify-center gap-0.5"
                          title={`${z.prijmeni} ${z.jmeno}`}
                          style={{
                            height: 74,
                            borderRadius: "var(--radius-md)",
                            border: `1.5px solid ${done ? "var(--teal-500)" : "var(--ink-200)"}`,
                            background: done ? "var(--teal-50)" : "#fff",
                            opacity: casStartu ? 1 : 0.5,
                            cursor: casStartu ? "pointer" : "not-allowed",
                          }}
                        >
                          <span
                            style={{
                              font: "700 24px/1 var(--cal-font-mono)",
                              color: done
                                ? "var(--teal-700)"
                                : "var(--ink-900)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {z.startovniCislo}
                          </span>
                          <span
                            className="max-w-[74px] truncate"
                            style={{
                              font: "400 9.5px/1.1 var(--cal-font-sans)",
                              color: "var(--ink-400)",
                            }}
                          >
                            {z.prijmeni}
                          </span>
                          {done && (
                            <span
                              style={{
                                font: "500 9.5px var(--cal-font-mono)",
                                color: "var(--teal-600)",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {casDneKratky(new Date(i!.posledniMs))}
                              {i!.pocet > 1 ? ` ×${i!.pocet}` : ""}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Režim „Velké tlačítko" — uvnitř stejné skořápky směru B. */
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-6">
              <button
                onClick={zaznamenat}
                disabled={!casStartu}
                className="cal-press w-full max-w-[520px]"
                style={{
                  height: 188,
                  borderRadius: "var(--radius-xl)",
                  background: "var(--teal-500)",
                  color: "#fff",
                  boxShadow: "var(--shadow-primary)",
                  opacity: casStartu ? 1 : 0.45,
                  cursor: casStartu ? "pointer" : "not-allowed",
                }}
              >
                <span
                  className="block"
                  style={{
                    font: "800 38px var(--cal-font-sans)",
                    letterSpacing: "-.01em",
                  }}
                >
                  ZAZNAMENAT PRŮCHOD
                </span>
                <span
                  className="mt-2 block"
                  style={{
                    font: "500 12.5px var(--cal-font-mono)",
                    color: "rgba(255,255,255,.82)",
                  }}
                >
                  klik nebo mezerník · čas se uloží v okamžiku stisku
                </span>
              </button>

              <div className="flex w-full max-w-[520px] items-end gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label
                    style={{
                      font: "500 10.5px var(--cal-font-mono)",
                      letterSpacing: ".06em",
                      color: "var(--ink-500)",
                    }}
                  >
                    PŘEDVYPLNIT ČÍSLO
                  </label>
                  <input
                    value={inlineCislo}
                    onChange={(e) => setInlineCislo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") zaznamenat();
                    }}
                    inputMode="numeric"
                    placeholder="—"
                    className="text-center outline-none"
                    style={{
                      width: 128,
                      height: 50,
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--ink-250)",
                      background: "#fff",
                      font: "600 22px var(--cal-font-mono)",
                      color: "var(--ink-900)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  />
                </div>
                <p
                  className="flex-1 pb-1.5"
                  style={{
                    font: "400 12px var(--cal-font-sans)",
                    color: "var(--ink-500)",
                  }}
                >
                  {inlineCislo
                    ? zavodniciMap.get(Number(inlineCislo))
                      ? `${zavodniciMap.get(Number(inlineCislo))!.prijmeni} ${zavodniciMap.get(Number(inlineCislo))!.jmeno}`
                      : "neznámé číslo"
                    : `Bez čísla → fronta „k doplnění" (${kDoplneni.length}).`}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ---------- Patička ---------- */}
      <footer
        className="flex flex-none items-center justify-between px-4 sm:px-6"
        style={{
          height: 34,
          borderTop: "1px solid var(--ink-150)",
          background: "#fff",
          font: "400 11px var(--cal-font-mono)",
          color: "var(--ink-400)",
        }}
      >
        <span>
          Tip: notebook nech v síti a vypni spánek (<code>caffeinate -d</code>).
        </span>
        <span className="flex items-center gap-3">
          <span title="Automatická lokální záloha každých 30 s">
            {posledniZaloha
              ? `záloha ${casDneKratky(new Date(posledniZaloha))}`
              : "záloha —"}
          </span>
          <Link
            href={`/admin/akce/${akceId}`}
            className="underline"
            style={{ color: "var(--ink-500)" }}
          >
            zpět na akci
          </Link>
          <PoweredBy />
        </span>
      </footer>
    </div>
  );
}

/** Stavová pilulka ONLINE / OFFLINE s tečkou. */
function StatusChip({
  ok,
  okLabel,
  errLabel,
}: {
  ok: boolean;
  okLabel: string;
  errLabel: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        font: "500 10.5px var(--cal-font-mono)",
        letterSpacing: ".06em",
        color: ok ? "var(--success)" : "var(--error)",
        background: ok ? "var(--success-bg)" : "var(--error-bg)",
        padding: "7px 11px",
        borderRadius: "var(--radius-pill)",
      }}
    >
      <span
        className={ok ? "cal-livedot" : undefined}
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: ok ? "var(--success)" : "var(--error)",
        }}
      />
      {ok ? okLabel : errLabel}
    </span>
  );
}

/** Pilulka stavu synchronizace (kolik průchodů čeká na odeslání). */
function SyncChip({ dirty }: { dirty: number }) {
  const clean = dirty === 0;
  return (
    <span
      className="hidden items-center gap-1.5 sm:inline-flex"
      style={{
        font: "500 10.5px var(--cal-font-mono)",
        letterSpacing: ".06em",
        color: clean ? "var(--ink-500)" : "var(--warning)",
        background: clean ? "var(--ink-100)" : "var(--warning-bg)",
        padding: "7px 11px",
        borderRadius: "var(--radius-pill)",
      }}
    >
      {clean ? "✓ ULOŽENO" : `⟳ ${dirty}`}
    </span>
  );
}

/** Záložka přepínače režimu měření. */
function RezimTab({
  aktivni,
  onClick,
  children,
}: {
  aktivni: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1"
      style={{
        textAlign: "center",
        padding: "7px 0",
        borderRadius: 7,
        font: `${aktivni ? 600 : 500} 12px var(--cal-font-sans)`,
        color: aktivni ? "var(--ink-900)" : "var(--ink-500)",
        background: aktivni ? "#fff" : "transparent",
        boxShadow: aktivni ? "var(--shadow-xs)" : "none",
      }}
    >
      {children}
    </button>
  );
}

/** Karta fronty „k doplnění" — čistý čas + inline přiřazení čísla. */
function QueueCard({
  cisty,
  wall,
  onAssign,
}: {
  cisty: string;
  wall: string;
  onAssign: (v: string) => void;
}) {
  const [v, setV] = useState("");
  const commit = () => {
    const t = v.trim();
    if (t) {
      onAssign(t);
      setV("");
    }
  };
  return (
    <div
      className="mb-[7px] flex items-center gap-[10px]"
      style={{
        background: "var(--warning-bg)",
        border: "1px solid var(--queue-border)",
        borderRadius: "var(--radius-md)",
        padding: "9px 10px",
      }}
    >
      <div className="flex-1">
        <div
          style={{
            font: "700 15px var(--cal-font-mono)",
            color: "var(--ink-900)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {cisty}
        </div>
        <div
          style={{
            font: "400 10.5px var(--cal-font-mono)",
            color: "var(--ink-500)",
          }}
        >
          {wall}
        </div>
      </div>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        onBlur={commit}
        inputMode="numeric"
        placeholder="č."
        className="text-center outline-none"
        style={{
          width: 52,
          height: 40,
          borderRadius: 8,
          border: "1px solid var(--amber-500)",
          background: "#fff",
          color: "var(--ink-900)",
          font: "600 16px var(--cal-font-mono)",
          fontVariantNumeric: "tabular-nums",
        }}
      />
    </div>
  );
}

/** Řádek historie „POSLEDNÍ" — editovatelné číslo + smazání průchodu. */
function PosledniRadek({
  cislo,
  jmeno,
  zname,
  cas,
  onReassign,
  onDelete,
}: {
  cislo: number | null;
  jmeno: string;
  zname: boolean;
  cas: string;
  onReassign: (v: string) => void;
  onDelete: () => void;
}) {
  const [uprava, setUprava] = useState(false);
  const [v, setV] = useState(cislo !== null ? String(cislo) : "");
  const commit = () => {
    const t = v.trim();
    if (t && t !== String(cislo)) onReassign(t);
    setUprava(false);
  };
  return (
    <div
      className="flex items-center gap-[8px] px-1 py-2"
      style={{ borderBottom: "1px solid var(--ink-150)" }}
    >
      {uprava ? (
        <input
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setUprava(false);
          }}
          onBlur={commit}
          inputMode="numeric"
          className="text-center outline-none"
          style={{
            width: 44,
            height: 30,
            borderRadius: 7,
            border: "1px solid var(--teal-500)",
            font: "700 14px var(--cal-font-mono)",
            fontVariantNumeric: "tabular-nums",
          }}
        />
      ) : (
        <button
          onClick={() => {
            setV(cislo !== null ? String(cislo) : "");
            setUprava(true);
          }}
          title="Upravit číslo"
          style={{
            font: "700 14px var(--cal-font-mono)",
            color: "var(--teal-600)",
            fontVariantNumeric: "tabular-nums",
            minWidth: 30,
            textAlign: "left",
          }}
        >
          {cislo ?? "—"}
        </button>
      )}
      <span
        className="min-w-0 flex-1 truncate"
        style={{
          font: "400 12px/1.3 var(--cal-font-sans)",
          color: zname ? "var(--ink-700)" : "var(--error)",
        }}
      >
        {jmeno}
      </span>
      <span
        style={{
          font: "500 12px var(--cal-font-mono)",
          color: "var(--ink-500)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {cas}
      </span>
      <button
        onClick={onDelete}
        title="Smazat průchod"
        className="flex-none"
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          color: "var(--ink-400)",
          font: "700 14px var(--cal-font-sans)",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
