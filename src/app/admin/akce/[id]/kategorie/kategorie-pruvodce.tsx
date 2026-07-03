"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/app/admin/_components/ui";
import { Dialog } from "@/app/admin/_components/ui-client";
import {
  generujKategorie,
  type PohlaviRezim,
} from "@/lib/kategorie-generator";
import { vytvoritKategorieHromadne } from "@/server/kategorie";

/** Průvodce hromadným vytvořením věkových kategorií (M/Ž po pásmech). */
export function KategoriePruvodce({ akceId }: { akceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rezim, setRezim] = useState<PohlaviRezim>("oddelene");
  const [sirka, setSirka] = useState(10);
  const [od, setOd] = useState(0);
  const [doVek, setDoVek] = useState(99);
  const [posledniOtevrena, setPosledniOtevrena] = useState(true);
  const [uklada, setUklada] = useState(false);

  const nahled = useMemo(
    () => generujKategorie({ rezim, sirka, od, doVek, posledniOtevrena }),
    [rezim, sirka, od, doVek, posledniOtevrena],
  );

  async function vytvorit() {
    if (nahled.length === 0) return;
    setUklada(true);
    try {
      await vytvoritKategorieHromadne(akceId, nahled);
      setOpen(false);
      router.refresh();
    } finally {
      setUklada(false);
    }
  }

  return (
    <>
      <Btn variant="ghost" onClick={() => setOpen(true)}>
        Průvodce
      </Btn>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Průvodce kategoriemi"
        size="lg"
      >
        <p className="mb-4 text-sm text-ink-500">
          Vygeneruje věkové kategorie podle pásem. Ročníkové dělení nebo výjimky
          uprav pak ručně. Kategorie se připojí za stávající.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="cal-label">
            Pohlaví
            <select
              value={rezim}
              onChange={(e) => setRezim(e.target.value as PohlaviRezim)}
              className="cal-input"
            >
              <option value="oddelene">Odděleně muži i ženy</option>
              <option value="muzi">Jen muži</option>
              <option value="zeny">Jen ženy</option>
              <option value="smisene">Smíšené</option>
            </select>
          </label>
          <label className="cal-label">
            Šířka pásma (let)
            <input
              type="number"
              min={1}
              value={sirka}
              onChange={(e) => setSirka(Number(e.target.value))}
              className="cal-input"
            />
          </label>
          <label className="cal-label">
            Od věku
            <input
              type="number"
              min={0}
              value={od}
              onChange={(e) => setOd(Number(e.target.value))}
              className="cal-input"
            />
          </label>
          <label className="cal-label">
            Do věku
            <input
              type="number"
              min={0}
              value={doVek}
              onChange={(e) => setDoVek(Number(e.target.value))}
              className="cal-input"
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={posledniOtevrena}
            onChange={(e) => setPosledniOtevrena(e.target.checked)}
            className="h-4 w-4 accent-teal-500"
          />
          Nejstarší kategorie bez horní hranice (např. „60+ let“)
        </label>

        {/* Náhled */}
        <div className="mt-5">
          <div className="cal-eyebrow mb-2">
            Náhled — {nahled.length}{" "}
            {nahled.length === 1 ? "kategorie" : "kategorií"}
          </div>
          <div className="max-h-52 overflow-y-auto rounded-[10px] border border-ink-150">
            <div className="divide-y divide-ink-150">
              {nahled.map((k) => (
                <div
                  key={`${k.pohlavi}-${k.kod}`}
                  className="flex items-center gap-3 px-3 py-1.5 text-sm"
                >
                  <span className="w-12 flex-none font-technical text-teal-600">
                    {k.kod}
                  </span>
                  <span className="text-ink-900">{k.nazev}</span>
                </div>
              ))}
              {nahled.length === 0 && (
                <p className="px-3 py-3 text-sm text-ink-400">
                  Zadej platný rozsah (od ≤ do).
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Btn variant="ghost" onClick={() => setOpen(false)}>
            Zrušit
          </Btn>
          <Btn onClick={vytvorit} disabled={uklada || nahled.length === 0}>
            {uklada ? "Vytvářím…" : `Vytvořit ${nahled.length}`}
          </Btn>
        </div>
      </Dialog>
    </>
  );
}
