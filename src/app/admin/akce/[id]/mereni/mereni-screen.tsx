"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { casDne, casDneKratky, uplynulyCas } from "@/lib/cas";
import { useWakeLock } from "@/lib/wake-lock";
import {
  ulozPruchod,
  nactiProAkci,
  nactiDirty,
  oznacCisté,
  type OutboxPruchod,
} from "@/lib/outbox";
import { ulozitPruchody, nastavitStart } from "@/server/mereni";

interface ZavodnikInfo {
  startovniCislo: number | null;
  jmeno: string;
  prijmeni: string;
}

export function MereniScreen({
  akceId,
  casStartu: casStartuProp,
  zavodnici,
  pocatecniZaznamy,
}: {
  akceId: string;
  casStartu: string | null;
  zavodnici: ZavodnikInfo[];
  pocatecniZaznamy: OutboxPruchod[];
}) {
  const [zaznamy, setZaznamy] = useState<OutboxPruchod[]>(pocatecniZaznamy);
  const [inlineCislo, setInlineCislo] = useState("");
  const [rezim, setRezim] = useState<"tlacitko" | "ciselnik">("tlacitko");
  const [filtr, setFiltr] = useState("");
  const [casStartu, setCasStartu] = useState<string | null>(casStartuProp);
  const [online, setOnline] = useState(true);
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
    setOnline(navigator.onLine);
    return () => {
      clearInterval(i);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [sync]);

  // --- zaznamenání průchodu (kritická cesta: stav → IndexedDB → server) ---
  // Jádro sdílené velkým tlačítkem i číselníkem. Razítko vzniká v okamžiku volání.
  const pridejPruchod = useCallback(
    async (platneCislo: number | null) => {
      const cas = new Date(); // wall-clock, ms (NIKDY performance.now)
      poradiRef.current += 1;
      const p: OutboxPruchod = {
        clientId: crypto.randomUUID(),
        akceId,
        casCile: cas.toISOString(),
        startovniCislo: platneCislo,
        stav: platneCislo !== null ? "platny" : "neprirazeno",
        poradiDoteku: poradiRef.current,
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
    [akceId, sync],
  );

  const zaznamenat = useCallback(async () => {
    const cisloStr = inlineCislo.trim();
    const cislo = cisloStr ? parseInt(cisloStr.replace(/\D/g, ""), 10) : null;
    const platneCislo = cislo !== null && Number.isFinite(cislo) ? cislo : null;
    setInlineCislo("");
    await pridejPruchod(platneCislo);
  }, [inlineCislo, pridejPruchod]);

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

  // --- odvozené ---
  const viditelne = useMemo(
    () =>
      [...zaznamy]
        .filter((z) => z.stav !== "smazany")
        .sort((a, b) => b.poradiDoteku - a.poradiDoteku),
    [zaznamy],
  );
  const kDoplneni = viditelne.filter((z) => z.startovniCislo === null).length;
  const dirtyPocet = zaznamy.filter((z) => z.dirty).length;
  const startMs = casStartu ? new Date(casStartu).getTime() : null;

  // Použitá čísla (pro detekci konfliktů ve frontě) + info pro číselník
  // (počet průchodů a čas posledního) podle čísla.
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

  // Seznam startovních čísel pro číselník (vzestupně), volitelně filtrovaný.
  const cislaZavodniku = useMemo(() => {
    const f = filtr.trim();
    return zavodnici
      .filter((z) => z.startovniCislo !== null)
      .filter((z) => (f ? String(z.startovniCislo).startsWith(f) : true))
      .sort((a, b) => (a.startovniCislo ?? 0) - (b.startovniCislo ?? 0));
  }, [zavodnici, filtr]);

  async function start() {
    const iso = new Date().toISOString();
    setCasStartu(iso);
    await nastavitStart(akceId, iso);
  }
  async function zrusitStart() {
    setCasStartu(null);
    await nastavitStart(akceId, null);
  }

  return (
    <div className="mt-2">
      {/* Stavový řádek */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <StavZnacka ok={online} okText="● online" chybaText="● offline (ukládám lokálně)" />
        <span className="text-gray-500">
          {dirtyPocet > 0 ? `⟳ ${dirtyPocet} k odeslání` : "✓ vše odesláno"}
        </span>
        {wakePodporovano ? (
          <span className={wakeDrzi ? "text-green-600" : "text-gray-400"}>
            {wakeDrzi ? "🔆 obrazovka aktivní" : "obrazovka neuzamčena"}
          </span>
        ) : (
          <span className="text-gray-400">Wake Lock nepodporován</span>
        )}
      </div>

      {/* Start */}
      <div className="mb-4 rounded-lg border p-3">
        {casStartu ? (
          <div className="flex items-center justify-between">
            <span>
              <span className="text-gray-500">Start akce: </span>
              <strong className="tabular-nums">{casDne(casStartu)}</strong>
            </span>
            <button
              onClick={zrusitStart}
              className="text-sm text-red-600 underline"
            >
              zrušit start
            </button>
          </div>
        ) : (
          <button
            onClick={start}
            className="w-full rounded-lg bg-green-600 py-4 text-xl font-bold text-white"
          >
            ▶ START (hromadný)
          </button>
        )}
      </div>

      {/* Přepínač režimu měření */}
      <div className="mb-3 flex gap-2 text-sm">
        <RezimBtn aktivni={rezim === "tlacitko"} onClick={() => setRezim("tlacitko")}>
          Velké tlačítko
        </RezimBtn>
        <RezimBtn aktivni={rezim === "ciselnik"} onClick={() => setRezim("ciselnik")}>
          Číselník
        </RezimBtn>
      </div>

      {rezim === "tlacitko" ? (
        <>
          {/* Záznam průchodu */}
          <div className="mb-2 grid grid-cols-[1fr_auto] gap-3">
            <button
              onClick={zaznamenat}
              className="rounded-xl bg-black py-10 text-3xl font-extrabold text-white active:bg-gray-700"
            >
              ZAZNAMENAT PRŮCHOD
            </button>
            <div className="flex w-40 flex-col justify-center gap-1">
              <label className="text-xs text-gray-500">Předvyplnit číslo</label>
              <input
                value={inlineCislo}
                onChange={(e) => setInlineCislo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") zaznamenat();
                }}
                inputMode="numeric"
                placeholder="—"
                className="rounded-lg border-2 border-gray-300 px-3 py-3 text-center text-2xl tabular-nums"
              />
              {inlineCislo && (
                <span className="text-center text-xs text-gray-500">
                  {zavodniciMap.get(Number(inlineCislo))
                    ? `${zavodniciMap.get(Number(inlineCislo))!.prijmeni} ${zavodniciMap.get(Number(inlineCislo))!.jmeno}`
                    : "neznámé číslo"}
                </span>
              )}
            </div>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Čas se uloží v okamžiku kliknutí. Bez čísla → fronta „K doplnění" (
            {kDoplneni}).
          </p>
        </>
      ) : (
        <Ciselnik
          cisla={cislaZavodniku}
          info={cislaInfo}
          filtr={filtr}
          setFiltr={setFiltr}
          onTap={(c) => pridejPruchod(c)}
        />
      )}

      {/* Fronta */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-gray-500">
            <tr>
              <th className="py-2">#</th>
              <th>Čas cíle</th>
              {startMs !== null && <th>Čistý čas</th>}
              <th>Číslo</th>
              <th>Jméno</th>
              <th>Stav</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {viditelne.map((z) => {
              const zav =
                z.startovniCislo !== null
                  ? zavodniciMap.get(z.startovniCislo)
                  : undefined;
              const cisloNeexistuje =
                z.startovniCislo !== null && !zav;
              const konflikt =
                z.startovniCislo !== null &&
                (cislaInfo.get(z.startovniCislo)?.pocet ?? 0) > 1;
              const cas = new Date(z.casCile).getTime();
              return (
                <tr
                  key={z.clientId}
                  className={`border-b last:border-0 ${z.startovniCislo === null ? "bg-amber-50" : ""}`}
                >
                  <td className="py-1.5 tabular-nums text-gray-400">
                    {z.poradiDoteku}
                  </td>
                  <td className="tabular-nums">{casDne(z.casCile)}</td>
                  {startMs !== null && (
                    <td className="tabular-nums font-medium">
                      {uplynulyCas(cas - startMs)}
                    </td>
                  )}
                  <td>
                    {z.startovniCislo === null ? (
                      <CisloInput
                        onSubmit={(v) => priraditCislo(z.clientId, v)}
                      />
                    ) : (
                      <span className="tabular-nums font-semibold">
                        {z.startovniCislo}
                      </span>
                    )}
                  </td>
                  <td>
                    {zav ? (
                      `${zav.prijmeni} ${zav.jmeno}`
                    ) : z.startovniCislo === null ? (
                      <span className="text-amber-600">k doplnění</span>
                    ) : (
                      <span className="text-red-600">neznámé číslo</span>
                    )}
                  </td>
                  <td className="text-xs">
                    {z.stav === "DNF" && (
                      <span className="rounded bg-gray-200 px-1.5 py-0.5">DNF</span>
                    )}
                    {konflikt && (
                      <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-red-700">
                        konflikt čísla
                      </span>
                    )}
                    {cisloNeexistuje && (
                      <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-red-700">
                        není v listině
                      </span>
                    )}
                    {!z.dirty ? (
                      <span className="ml-1 text-green-500">✓</span>
                    ) : (
                      <span className="ml-1 text-gray-300">⟳</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      {z.stav !== "DNF" ? (
                        <button
                          onClick={() => upravZaznam(z.clientId, { stav: "DNF" })}
                          className="text-xs text-gray-500 underline"
                        >
                          DNF
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            upravZaznam(z.clientId, {
                              stav:
                                z.startovniCislo !== null
                                  ? "platny"
                                  : "neprirazeno",
                            })
                          }
                          className="text-xs text-gray-500 underline"
                        >
                          zrušit DNF
                        </button>
                      )}
                      <button
                        onClick={() =>
                          upravZaznam(z.clientId, { stav: "smazany" })
                        }
                        className="text-xs text-red-600 underline"
                      >
                        smazat
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {viditelne.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  Zatím žádné průchody.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Tip: notebook nech v síti a vypni spánek (macOS <code>caffeinate -d</code>).{" "}
        <Link href={`/admin/akce/${akceId}`} className="underline">
          zpět na akci
        </Link>
      </p>
    </div>
  );
}

function CisloInput({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && v.trim()) {
          onSubmit(v.trim());
          setV("");
        }
      }}
      onBlur={() => {
        if (v.trim()) {
          onSubmit(v.trim());
          setV("");
        }
      }}
      inputMode="numeric"
      placeholder="č."
      className="w-16 rounded border border-amber-300 px-2 py-1 text-center tabular-nums"
    />
  );
}

function StavZnacka({
  ok,
  okText,
  chybaText,
}: {
  ok: boolean;
  okText: string;
  chybaText: string;
}) {
  return (
    <span className={ok ? "text-green-600" : "text-red-600"}>
      {ok ? okText : chybaText}
    </span>
  );
}

function RezimBtn({
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
      className={`rounded-full px-4 py-1.5 font-medium ${
        aktivni ? "bg-black text-white" : "bg-gray-100 text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Číselník — mřížka všech startovních čísel. „Domačkávání": ťuknutím na číslo
 * se zaznamená průchod daného běžce (razítko teď). Doběhlí zezelenají, ukáže se
 * čas a u opakování počet (×N) pro kontrolu.
 */
function Ciselnik({
  cisla,
  info,
  filtr,
  setFiltr,
  onTap,
}: {
  cisla: ZavodnikInfo[];
  info: Map<number, { pocet: number; posledniMs: number }>;
  filtr: string;
  setFiltr: (v: string) => void;
  onTap: (cislo: number) => void;
}) {
  const dobehlo = cisla.filter((z) => info.has(z.startovniCislo!)).length;
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <input
          value={filtr}
          onChange={(e) => setFiltr(e.target.value)}
          inputMode="numeric"
          placeholder="filtr čísla…"
          className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm tabular-nums"
        />
        <span className="text-xs text-gray-500">
          {dobehlo}/{cisla.length} doběhlo
        </span>
      </div>
      {cisla.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          Žádná startovní čísla (naimportuj závodníky).
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
          {cisla.map((z) => {
            const i = info.get(z.startovniCislo!);
            const dobehl = !!i;
            return (
              <button
                key={z.startovniCislo}
                onClick={() => onTap(z.startovniCislo!)}
                className={`flex flex-col items-center rounded-lg border-2 px-1 py-2 active:scale-95 ${
                  dobehl
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 bg-white"
                }`}
                title={`${z.prijmeni} ${z.jmeno}`}
              >
                <span className="text-2xl font-bold tabular-nums leading-none">
                  {z.startovniCislo}
                </span>
                <span className="mt-0.5 max-w-full truncate text-[10px] text-gray-500">
                  {z.prijmeni}
                </span>
                {dobehl && (
                  <span className="mt-0.5 text-[10px] tabular-nums text-green-700">
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
  );
}
