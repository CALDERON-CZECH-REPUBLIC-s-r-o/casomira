"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn, Card } from "@/app/admin/_components/ui";
import { nactiZalohy, stahniZalohu, type ZalohaMeta } from "@/lib/zalohy";

/**
 * Lokální zálohy akce (IndexedDB) — snapshoty ukládá background worker à 30 s
 * v prohlížeči operátora. Umožní stáhnout kteroukoli jako JSON (obnova pak přes
 * „Obnovit ze zálohy" výše).
 */
export function LokalniZalohy({ akceId }: { akceId: string }) {
  const [zalohy, setZalohy] = useState<ZalohaMeta[]>([]);
  const [chyba, setChyba] = useState(false);

  const obnov = useCallback(() => {
    nactiZalohy(akceId)
      .then((z) => {
        setZalohy(z);
        setChyba(false);
      })
      .catch(() => setChyba(true));
  }, [akceId]);

  useEffect(() => {
    obnov();
    const i = setInterval(obnov, 15000);
    return () => clearInterval(i);
  }, [obnov]);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="cal-eyebrow text-ink-500">Lokální zálohy</div>
          <p className="mt-1 text-sm text-ink-500">
            Automaticky každých 30 s do tohoto prohlížeče (běží na pozadí i po
            odchodu z měření). Rolling posledních 20.
          </p>
        </div>
        <Btn variant="ghost" onClick={obnov}>
          Obnovit
        </Btn>
      </div>

      {chyba ? (
        <p className="text-sm text-ink-400">Lokální úložiště není dostupné.</p>
      ) : zalohy.length === 0 ? (
        <p className="text-sm text-ink-400">
          Zatím žádná záloha — vytvoří se během měření.
        </p>
      ) : (
        <div className="divide-y divide-ink-150">
          {zalohy.map((z) => (
            <div key={z.kdy} className="flex items-center justify-between py-2.5">
              <span className="font-technical text-[13px] tabular-nums text-ink-700">
                {new Date(z.kdy).toLocaleString("cs-CZ")}
              </span>
              <button
                onClick={() => stahniZalohu(z.kdy)}
                className="text-[13px] font-medium text-teal-600 transition-colors hover:text-teal-700"
              >
                Stáhnout JSON
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
