"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { casDne, uplynulyCas } from "@/lib/cas";
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
  const zaznamenat = useCallback(async () => {
    const cas = new Date(); // wall-clock, ms (NIKDY performance.now)
    poradiRef.current += 1;
    const cisloStr = inlineCislo.trim();
    const cislo = cisloStr ? parseInt(cisloStr.replace(/\D/g, ""), 10) : null;
    const platneCislo = cislo !== null && Number.isFinite(cislo) ? cislo : null;

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
    setInlineCislo("");
    try {
      await ulozPruchod(p); // pojistka dřív než server
    } catch {
      /* i bez IndexedDB pokračujeme – záznam je ve stavu a půjde na server */
    }
    sync();
  }, [akceId, inlineCislo, sync]);

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

  // Použitá čísla (pro detekci konfliktů ve frontě).
  const pouzitaCisla = useMemo(() => {
    const m = new Map<number, number>();
    for (const z of zaznamy) {
      if (z.stav !== "smazany" && z.startovniCislo !== null) {
        m.set(z.startovniCislo, (m.get(z.startovniCislo) ?? 0) + 1);
      }
    }
    return m;
  }, [zaznamy]);

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
                (pouzitaCisla.get(z.startovniCislo) ?? 0) > 1;
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
