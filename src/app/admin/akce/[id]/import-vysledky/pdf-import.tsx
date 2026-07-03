"use client";

import { useState, useTransition } from "react";
import { parseCasNaMs } from "@/lib/import-helpers";
import { importovatHistorickeVysledky } from "@/server/zavodnici";
import { Btn, BtnLink, Card, Pill, Stepper } from "../../../_components/ui";

/** Jeden řádek náhledu — vše jako string kvůli editovatelnosti. */
type Radek = {
  poradi: string;
  cislo: string;
  prijmeni: string;
  jmeno: string;
  rocnik: string;
  oddil: string;
  cas: string;
};

const TIME_RE = /\b(?:\d{1,2}:\d{2}:\d{2}(?:[.,]\d)?|\d{1,2}:\d{1,2}(?:[.,]\d)?)\b/;

/**
 * Rekonstruuje textové řádky z PDF: položky se seskupí podle y-souřadnice
 * (transform[5]) a v rámci řádku se seřadí podle x (transform[4]).
 */
async function extrahovatRadky(file: File): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = (
      await import("pdfjs-dist/build/pdf.worker.min.mjs")
    ).default;
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const radky: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const skupiny = new Map<number, { x: number; s: string }[]>();
    for (const item of tc.items) {
      if (!("str" in item)) continue;
      const str = item.str;
      if (!str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4] as number;
      // sloučit blízké y do jednoho řádku (tolerance 2px)
      let klic = y;
      for (const k of skupiny.keys()) {
        if (Math.abs(k - y) <= 2) {
          klic = k;
          break;
        }
      }
      const arr = skupiny.get(klic) ?? [];
      arr.push({ x, s: str });
      skupiny.set(klic, arr);
    }
    const yKlice = [...skupiny.keys()].sort((a, b) => b - a); // shora dolů
    for (const yk of yKlice) {
      const cast = skupiny
        .get(yk)!
        .sort((a, b) => a.x - b.x)
        .map((i) => i.s)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (cast) radky.push(cast);
    }
  }
  return radky;
}

/** Heuristické rozparsování jednoho řádku na Radek; null = řádek bez času. */
function parsovatRadek(line: string): Radek | null {
  const cas = line.match(TIME_RE)?.[0];
  if (!cas) return null;

  const pred = line.slice(0, line.indexOf(cas)).trim();
  const tokeny = pred.split(/\s+/).filter(Boolean);

  let poradi = "";
  let cislo = "";
  let rocnik = "";
  const jmenaTokeny: string[] = [];
  const oddilTokeny: string[] = [];

  const isInt = (t: string) => /^\d+$/.test(t);
  const isRocnik = (t: string) => /^(?:19|20)\d{2}$/.test(t);
  const isAlpha = (t: string) => /[A-Za-zÁ-Žá-ž]/.test(t);

  let jmenaHotova = false;
  for (const t of tokeny) {
    if (isRocnik(t)) {
      rocnik = t;
      jmenaHotova = jmenaTokeny.length > 0;
      continue;
    }
    if (isInt(t)) {
      if (poradi === "") poradi = t;
      else if (cislo === "" && jmenaTokeny.length === 0) cislo = t;
      else oddilTokeny.push(t);
      continue;
    }
    if (isAlpha(t)) {
      if (!jmenaHotova && jmenaTokeny.length < 2) jmenaTokeny.push(t);
      else oddilTokeny.push(t);
      continue;
    }
    oddilTokeny.push(t);
  }

  return {
    poradi,
    cislo,
    prijmeni: jmenaTokeny[0] ?? "",
    jmeno: jmenaTokeny[1] ?? "",
    rocnik,
    oddil: oddilTokeny.join(" "),
    cas: cas.replace(",", "."),
  };
}

const prazdny = (): Radek => ({
  poradi: "",
  cislo: "",
  prijmeni: "",
  jmeno: "",
  rocnik: "",
  oddil: "",
  cas: "",
});

function radekPlatny(r: Radek): boolean {
  return r.prijmeni.trim() !== "" && parseCasNaMs(r.cas) !== null;
}

export function PdfImport({ akceId }: { akceId: string }) {
  const [radky, setRadky] = useState<Radek[]>([]);
  const [nazevSouboru, setNazevSouboru] = useState("");
  const [chybaPdf, setChybaPdf] = useState<string | null>(null);
  const [nacita, setNacita] = useState(false);
  const [vysledek, setVysledek] = useState<{
    ok: boolean;
    vlozeno: number;
    chyba?: string;
  } | null>(null);
  const [ukladam, startUkladani] = useTransition();

  const aktivni = vysledek?.ok ? 2 : radky.length > 0 ? 1 : 0;
  const platnych = radky.filter(radekPlatny).length;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setChybaPdf(null);
    setVysledek(null);
    setRadky([]);
    setNazevSouboru(file.name);
    setNacita(true);
    try {
      const textRadky = await extrahovatRadky(file);
      if (textRadky.length === 0) {
        setChybaPdf(
          "PDF neobsahuje žádný extrahovatelný text (patrně skenovaný obrázek).",
        );
        return;
      }
      const parsed = textRadky
        .map(parsovatRadek)
        .filter((r): r is Radek => r !== null);
      if (parsed.length === 0) {
        setChybaPdf(
          "V PDF se nepodařilo rozpoznat žádný řádek s časem. Zkontroluj, že jde o výsledkovou listinu.",
        );
        return;
      }
      setRadky(parsed);
    } catch (err) {
      setChybaPdf(
        `Nepodařilo se přečíst PDF: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setNacita(false);
    }
  }

  function uprav(i: number, pole: keyof Radek, hodnota: string) {
    setRadky((prev) =>
      prev.map((r, j) => (j === i ? { ...r, [pole]: hodnota } : r)),
    );
  }

  function smaz(i: number) {
    setRadky((prev) => prev.filter((_, j) => j !== i));
  }

  function ulozit() {
    const data = radky
      .filter(radekPlatny)
      .map((r) => {
        const casMs = parseCasNaMs(r.cas);
        const cislo = r.cislo.trim() === "" ? null : parseInt(r.cislo, 10);
        const rocnik = r.rocnik.trim() === "" ? null : parseInt(r.rocnik, 10);
        return {
          prijmeni: r.prijmeni.trim(),
          jmeno: r.jmeno.trim(),
          rokNarozeni: rocnik !== null && Number.isFinite(rocnik) ? rocnik : null,
          startovniCislo:
            cislo !== null && Number.isFinite(cislo) && cislo > 0 ? cislo : null,
          oddil: r.oddil.trim() === "" ? null : r.oddil.trim(),
          casMs: casMs!,
        };
      });
    startUkladani(async () => {
      const r = await importovatHistorickeVysledky(akceId, data);
      setVysledek(r);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper kroky={["Nahrát PDF", "Kontrola", "Uložit"]} aktivni={aktivni} />

      {/* Krok 1 — nahrání souboru */}
      <Card className="p-5">
        <label className="cal-label">
          PDF výsledková listina
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={onFile}
            disabled={nacita || ukladam}
            className="cal-input file:mr-3 file:rounded-[8px] file:border-0 file:bg-ink-100 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-ink-700"
          />
        </label>
        {nazevSouboru && (
          <p className="mt-2 text-sm text-ink-500">
            {nacita ? "Zpracovávám" : "Načteno"}: {nazevSouboru}
          </p>
        )}
        {chybaPdf && (
          <p className="mt-3 rounded-[10px] bg-error-bg p-3 text-sm text-error">
            {chybaPdf}
          </p>
        )}
      </Card>

      {/* Krok 2 — editovatelný náhled */}
      {radky.length > 0 && !vysledek?.ok && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="cal-eyebrow">Kontrola řádků</div>
            <Pill ton={platnych === radky.length ? "success" : "warning"}>
              {platnych}/{radky.length} platných
            </Pill>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-1 text-sm">
              <thead>
                <tr className="cal-eyebrow text-left">
                  <th className="px-1 pb-2 font-medium">Poř.</th>
                  <th className="px-1 pb-2 font-medium">Číslo</th>
                  <th className="px-1 pb-2 font-medium">Příjmení</th>
                  <th className="px-1 pb-2 font-medium">Jméno</th>
                  <th className="px-1 pb-2 font-medium">Roč.</th>
                  <th className="px-1 pb-2 font-medium">Oddíl</th>
                  <th className="px-1 pb-2 font-medium">Čas</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {radky.map((r, i) => {
                  const spatny = !radekPlatny(r);
                  return (
                    <tr key={i} className={spatny ? "bg-error-bg" : ""}>
                      <Cell w="w-14">
                        <input
                          className="cal-input"
                          value={r.poradi}
                          onChange={(e) => uprav(i, "poradi", e.target.value)}
                        />
                      </Cell>
                      <Cell w="w-16">
                        <input
                          className="cal-input"
                          value={r.cislo}
                          onChange={(e) => uprav(i, "cislo", e.target.value)}
                        />
                      </Cell>
                      <Cell>
                        <input
                          className="cal-input"
                          value={r.prijmeni}
                          onChange={(e) => uprav(i, "prijmeni", e.target.value)}
                        />
                      </Cell>
                      <Cell>
                        <input
                          className="cal-input"
                          value={r.jmeno}
                          onChange={(e) => uprav(i, "jmeno", e.target.value)}
                        />
                      </Cell>
                      <Cell w="w-20">
                        <input
                          className="cal-input"
                          value={r.rocnik}
                          onChange={(e) => uprav(i, "rocnik", e.target.value)}
                        />
                      </Cell>
                      <Cell>
                        <input
                          className="cal-input"
                          value={r.oddil}
                          onChange={(e) => uprav(i, "oddil", e.target.value)}
                        />
                      </Cell>
                      <Cell w="w-24">
                        <input
                          className="cal-input font-technical tabular-nums"
                          value={r.cas}
                          onChange={(e) => uprav(i, "cas", e.target.value)}
                        />
                      </Cell>
                      <td className="px-1 align-middle">
                        <button
                          type="button"
                          onClick={() => smaz(i)}
                          aria-label="Smazat řádek"
                          className="cal-press flex h-7 w-7 items-center justify-center rounded-full text-ink-400 hover:bg-error-bg hover:text-error"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Btn
              variant="ghost"
              type="button"
              onClick={() => setRadky((p) => [...p, prazdny()])}
            >
              + Přidat řádek
            </Btn>
            <Btn
              type="button"
              onClick={ulozit}
              disabled={ukladam || platnych === 0}
            >
              {ukladam ? "Ukládám…" : `Uložit ${platnych} výsledků`}
            </Btn>
          </div>

          {vysledek && !vysledek.ok && (
            <p className="mt-3 rounded-[10px] bg-error-bg p-3 text-sm text-error">
              {vysledek.chyba ?? "Uložení selhalo."}
            </p>
          )}
        </Card>
      )}

      {/* Krok 3 — úspěch */}
      {vysledek?.ok && (
        <Card className="flex flex-col items-start gap-4 p-6">
          <Pill ton="success" dot>
            Hotovo
          </Pill>
          <p className="text-sm text-ink-700">
            Naimportováno{" "}
            <strong className="font-technical tabular-nums">
              {vysledek.vlozeno}
            </strong>{" "}
            historických výsledků. Akce byla označena jako historická.
          </p>
          <BtnLink href={`/admin/akce/${akceId}/zavodnici`}>
            Zobrazit závodníky
          </BtnLink>
        </Card>
      )}
    </div>
  );
}

function Cell({
  children,
  w = "",
}: {
  children: React.ReactNode;
  w?: string;
}) {
  return <td className={`px-1 align-middle ${w}`}>{children}</td>;
}
