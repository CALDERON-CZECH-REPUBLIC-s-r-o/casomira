"use client";

import { useMemo, useState, useTransition } from "react";
import { parseCasNaMs } from "@/lib/import-helpers";
import { importovatHistorii } from "@/server/historie";
import { Btn, BtnLink, Card, Pill, Stepper } from "../../_components/ui";

type Field =
  | "poradi"
  | "cislo"
  | "prijmeni"
  | "jmeno"
  | "prijmeniJmeno"
  | "rocnik"
  | "oddil"
  | "kategorie"
  | "cas";

const POLE: { v: Field | ""; label: string }[] = [
  { v: "", label: "— nepoužít —" },
  { v: "poradi", label: "Pořadí" },
  { v: "cislo", label: "Startovní číslo" },
  { v: "prijmeni", label: "Příjmení" },
  { v: "jmeno", label: "Jméno" },
  { v: "prijmeniJmeno", label: "Příjmení a jméno" },
  { v: "rocnik", label: "Ročník" },
  { v: "oddil", label: "Oddíl / Město" },
  { v: "kategorie", label: "Kategorie" },
  { v: "cas", label: "Čas" },
];

type Radek = {
  poradi: string;
  cislo: string;
  prijmeni: string;
  jmeno: string;
  rocnik: string;
  oddil: string;
  kategorie: string;
  cas: string;
};

const TIME_RE =
  /\b(?:\d{1,2}:\d{2}:\d{2}(?:[.,]\d)?|\d{1,2}:\d{1,2}(?:[.,]\d)?)\b/;
const ROCNIK_RE = /^(?:19|20)\d{2}$/;
const HDR_RE =
  /^(poř|pořadí|číslo|č\.|st\.?č|jméno|příjmení|ročník|roč|oddíl|klub|město|čas|kategorie|pohlaví)/i;

interface Token {
  x: number;
  w: number;
  s: string;
}

/** Extrahuje řádky z PDF jako pole tokenů (x, šířka, text), shora dolů. */
async function extrahovatTokeny(file: File): Promise<Token[][]> {
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
  const radky: Token[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const g = new Map<number, Token[]>();
    for (const it of tc.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      let k = y;
      for (const kk of g.keys())
        if (Math.abs(kk - y) <= 2) {
          k = kk;
          break;
        }
      const arr = g.get(k) ?? [];
      arr.push({ x: it.transform[4], w: it.width, s: it.str });
      g.set(k, arr);
    }
    for (const [, arr] of [...g.entries()].sort((a, b) => b[0] - a[0]))
      radky.push(arr.sort((a, b) => a.x - b.x));
  }
  return radky;
}

/**
 * Rozpozná sloupce: primárně kotví podle řádku s hlavičkou (výsledkovky ho mají),
 * data přiřadí k nejbližší kotvě. Bez hlavičky spadne na detekci mezer (gutters).
 */
function detekujMrizku(radky: Token[][]): {
  labely: string[] | null;
  mrizka: string[][];
} {
  const hdrIdx = radky.findIndex(
    (l) => l.filter((t) => HDR_RE.test(t.s)).length >= 3,
  );

  if (hdrIdx >= 0) {
    const kotvy = radky[hdrIdx].map((t) => ({ x: t.x, label: t.s }));
    const priradit = (l: Token[]): string[] => {
      const cols = kotvy.map(() => "");
      for (const t of l) {
        let bi = 0;
        let bd = Infinity;
        for (let i = 0; i < kotvy.length; i++) {
          const d = Math.abs(t.x - kotvy[i].x);
          if (d < bd) {
            bd = d;
            bi = i;
          }
        }
        cols[bi] = (cols[bi] + " " + t.s).trim();
      }
      return cols;
    };
    // Data = řádky pod hlavičkou (tituly nad ní vynecháme).
    const mrizka = radky
      .slice(hdrIdx + 1)
      .filter((l) => l.length >= 2)
      .map(priradit);
    return { labely: kotvy.map((k) => k.label), mrizka };
  }

  // Fallback: gutters přes řádky s ≥3 tokeny.
  const data = radky.filter((l) => l.length >= 3);
  const iv: [number, number][] = [];
  for (const l of data) for (const t of l) iv.push([t.x, t.x + t.w]);
  iv.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [a, b] of iv) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  const hranice = [-Infinity];
  for (let i = 1; i < merged.length; i++)
    if (merged[i][0] - merged[i - 1][1] >= 5)
      hranice.push((merged[i - 1][1] + merged[i][0]) / 2);
  hranice.push(Infinity);
  const priradit = (l: Token[]): string[] => {
    const cols = Array(hranice.length - 1).fill("");
    for (const t of l) {
      const c = t.x + t.w / 2;
      for (let i = 0; i < hranice.length - 1; i++)
        if (c >= hranice[i] && c < hranice[i + 1]) {
          cols[i] = (cols[i] + " " + t.s).trim();
          break;
        }
    }
    return cols;
  };
  return { labely: null, mrizka: data.map(priradit) };
}

/** Automapování: z labelů hlavičky, jinak z obsahu sloupce. */
function autoMapovani(
  labely: string[] | null,
  mrizka: string[][],
  pocet: number,
): (Field | "")[] {
  const map: (Field | "")[] = Array(pocet).fill("");
  const vzorky = (i: number) =>
    mrizka
      .map((r) => r[i] ?? "")
      .filter(Boolean)
      .slice(0, 20);

  for (let i = 0; i < pocet; i++) {
    const l = (labely?.[i] ?? "").toLowerCase();
    if (/příjmen|prijmen/.test(l)) map[i] = "prijmeni";
    else if (/jméno|jmeno/.test(l)) map[i] = "jmeno";
    else if (/ročník|rocnik|roč/.test(l)) map[i] = "rocnik";
    else if (/čas|cas/.test(l)) map[i] = "cas";
    else if (/číslo|cislo|st\.?č|č\./.test(l)) map[i] = "cislo";
    else if (/poř|pořadí|poradi/.test(l)) map[i] = "poradi";
    else if (/oddíl|oddil|klub|město|mesto/.test(l)) map[i] = "oddil";
    else if (/kategorie|kat\./.test(l)) map[i] = "kategorie";
    // pohlaví → nepoužít (necháme prázdné)
  }

  // Doplň z obsahu, co label neurčil.
  const pouzito = new Set(map.filter(Boolean));
  for (let i = 0; i < pocet; i++) {
    if (map[i]) continue;
    const v = vzorky(i);
    if (v.length === 0) continue;
    const podil = (re: RegExp) =>
      v.filter((s) => re.test(s.trim())).length / v.length;
    if (!pouzito.has("cas") && podil(TIME_RE) >= 0.5) {
      map[i] = "cas";
      pouzito.add("cas");
    } else if (!pouzito.has("rocnik") && podil(ROCNIK_RE) >= 0.5) {
      map[i] = "rocnik";
      pouzito.add("rocnik");
    } else if (!pouzito.has("cislo") && podil(/^\d{1,4}$/) >= 0.5) {
      map[i] = pouzito.has("poradi") ? "cislo" : "poradi";
      pouzito.add(map[i]);
    } else if (podil(/[A-Za-zÁ-Žá-ž]/) >= 0.5) {
      map[i] = !pouzito.has("prijmeni")
        ? "prijmeni"
        : !pouzito.has("jmeno")
          ? "jmeno"
          : !pouzito.has("oddil")
            ? "oddil"
            : "";
      if (map[i]) pouzito.add(map[i]);
    }
  }
  return map;
}

const prazdny = (): Radek => ({
  poradi: "",
  cislo: "",
  prijmeni: "",
  jmeno: "",
  rocnik: "",
  oddil: "",
  kategorie: "",
  cas: "",
});

function radekZMapovani(cols: string[], mapovani: (Field | "")[]): Radek {
  const r = prazdny();
  cols.forEach((val, i) => {
    const f = mapovani[i];
    if (!f || !val.trim()) return;
    if (f === "prijmeniJmeno") {
      const parts = val.trim().split(/\s+/);
      r.prijmeni = parts[0] ?? "";
      r.jmeno = parts.slice(1).join(" ");
    } else if (f === "cas") {
      r.cas = (val.match(TIME_RE)?.[0] ?? val.trim()).replace(",", ".");
    } else if (f === "rocnik") {
      r.rocnik = val.match(/(?:19|20)\d{2}/)?.[0] ?? val.trim();
    } else if (f === "cislo" || f === "poradi") {
      r[f] = val.match(/\d+/)?.[0] ?? val.trim();
    } else {
      r[f] = val.trim();
    }
  });
  return r;
}

function radekPlatny(r: Radek): boolean {
  const ms = parseCasNaMs(r.cas);
  // Nulový čas = DNS/DNF (v listinách 00:00:00,0) — bez výsledku, neimportuje se.
  return r.prijmeni.trim() !== "" && ms !== null && ms > 0;
}

export function PdfImportHistorie() {
  const [rok, setRok] = useState("");
  const [akceNazev, setAkceNazev] = useState("");
  const [mrizka, setMrizka] = useState<string[][]>([]);
  const [labely, setLabely] = useState<string[] | null>(null);
  const [mapovani, setMapovani] = useState<(Field | "")[]>([]);
  const [nazevSouboru, setNazevSouboru] = useState("");
  const [chybaPdf, setChybaPdf] = useState<string | null>(null);
  const [nacita, setNacita] = useState(false);
  const [vysledek, setVysledek] = useState<{
    ok: boolean;
    vlozeno: number;
    chyba?: string;
  } | null>(null);
  const [ukladam, startUkladani] = useTransition();

  const pocetSl = mapovani.length;
  const maCas = mapovani.includes("cas");
  const maPrijmeni =
    mapovani.includes("prijmeni") || mapovani.includes("prijmeniJmeno");

  const rokN = parseInt(rok, 10);
  const rokPlatny = Number.isInteger(rokN) && rokN >= 1900 && rokN <= 2100;
  const nazevPlatny = akceNazev.trim() !== "";
  const metaOk = rokPlatny && nazevPlatny;

  // Naparsované řádky dle aktuálního mapování.
  const radky = useMemo(
    () => mrizka.map((cols) => radekZMapovani(cols, mapovani)),
    [mrizka, mapovani],
  );
  const platne = radky.filter(radekPlatny);

  const aktivni = vysledek?.ok ? 2 : mrizka.length > 0 ? 1 : 0;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setChybaPdf(null);
    setVysledek(null);
    setMrizka([]);
    setNazevSouboru(file.name);
    setNacita(true);
    try {
      const tokeny = await extrahovatTokeny(file);
      if (tokeny.length === 0) {
        setChybaPdf(
          "PDF neobsahuje extrahovatelný text (patrně skenovaný obrázek).",
        );
        return;
      }
      const { labely: lbl, mrizka: grid } = detekujMrizku(tokeny);
      const pocet = Math.max(0, ...grid.map((r) => r.length));
      const gridN = grid.map((r) => {
        const a = r.slice(0, pocet);
        while (a.length < pocet) a.push("");
        return a;
      });
      if (pocet === 0 || gridN.length === 0) {
        setChybaPdf(
          "Nepodařilo se rozpoznat sloupce. Zkontroluj, že jde o výsledkovou listinu.",
        );
        return;
      }
      setLabely(lbl && lbl.length >= pocet ? lbl.slice(0, pocet) : lbl);
      setMrizka(gridN);
      setMapovani(autoMapovani(lbl, gridN, pocet));
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

  function nastavMapovani(i: number, f: Field | "") {
    setMapovani((prev) => prev.map((m, j) => (j === i ? f : m)));
  }

  function ulozit() {
    // Startovní číslo se do historie neukládá (statistika, ne startovka).
    const data = platne.map((r) => {
      const rocnik = r.rocnik.trim() === "" ? null : parseInt(r.rocnik, 10);
      const poradi = r.poradi.trim() === "" ? null : parseInt(r.poradi, 10);
      return {
        prijmeni: r.prijmeni.trim(),
        jmeno: r.jmeno.trim(),
        rokNarozeni: rocnik !== null && Number.isFinite(rocnik) ? rocnik : null,
        oddil: r.oddil.trim() === "" ? null : r.oddil.trim(),
        kategorie: r.kategorie.trim() === "" ? null : r.kategorie.trim(),
        poradi:
          poradi !== null && Number.isFinite(poradi) && poradi > 0
            ? poradi
            : null,
        casMs: parseCasNaMs(r.cas)!,
      };
    });
    startUkladani(async () => {
      const r = await importovatHistorii(rokN, akceNazev.trim(), data);
      setVysledek(r);
    });
  }

  const ukazka = mrizka.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <Stepper
        kroky={["Ročník + PDF", "Mapování sloupců", "Uložit"]}
        aktivni={aktivni}
      />

      {/* Krok 1 — ročník + nahrání */}
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="cal-label">
            Rok (ročník)
            <input
              type="number"
              inputMode="numeric"
              value={rok}
              onChange={(e) => setRok(e.target.value)}
              placeholder="např. 2024"
              disabled={vysledek?.ok}
              className="cal-input"
            />
          </label>
          <label className="cal-label">
            Název akce / ročníku
            <input
              type="text"
              value={akceNazev}
              onChange={(e) => setAkceNazev(e.target.value)}
              placeholder="např. Žernosecký půlmaraton 2024"
              disabled={vysledek?.ok}
              className="cal-input"
            />
          </label>
        </div>

        <label className="cal-label mt-4">
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

      {/* Krok 2 — mapování sloupců + náhled */}
      {mrizka.length > 0 && !vysledek?.ok && (
        <Card className="p-5">
          <div className="mb-1 cal-eyebrow">Mapování sloupců</div>
          <p className="mb-4 text-sm text-ink-500">
            Rozpoznáno {pocetSl} sloupců{labely ? " (dle hlavičky)" : ""}. Urči,
            co je čím. Ukázka prvních řádků:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-x-1 text-sm">
              <thead>
                <tr>
                  {Array.from({ length: pocetSl }).map((_, i) => (
                    <th key={i} className="pb-2 text-left align-top">
                      <div className="cal-eyebrow mb-1 truncate">
                        {labely?.[i] || `Sloupec ${i + 1}`}
                      </div>
                      <select
                        value={mapovani[i] ?? ""}
                        onChange={(e) =>
                          nastavMapovani(i, e.target.value as Field | "")
                        }
                        className="cal-input"
                      >
                        {POLE.map((p) => (
                          <option key={p.v} value={p.v}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ukazka.map((cols, ri) => (
                  <tr key={ri}>
                    {cols.map((c, ci) => (
                      <td
                        key={ci}
                        className="max-w-[180px] truncate border-t border-ink-150 py-1.5 text-ink-700"
                      >
                        {c || <span className="text-ink-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!maCas || !maPrijmeni) && (
            <p className="mt-4 rounded-[10px] bg-warning-bg p-3 text-sm text-warning">
              Namapuj alespoň <strong>Příjmení</strong> (nebo „Příjmení a
              jméno“) a <strong>Čas</strong> — bez nich nejde výsledek uložit.
            </p>
          )}
          {!metaOk && (
            <p className="mt-3 rounded-[10px] bg-warning-bg p-3 text-sm text-warning">
              Vyplň nahoře <strong>Rok</strong> a <strong>Název akce</strong>.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Pill ton={platne.length > 0 ? "success" : "warning"}>
              {platne.length}/{radky.length} platných řádků
            </Pill>
            <Btn
              type="button"
              onClick={ulozit}
              disabled={ukladam || platne.length === 0 || !metaOk}
            >
              {ukladam ? "Ukládám…" : `Uložit ${platne.length} výsledků`}
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
            historických výsledků ročníku {akceNazev.trim()}. Neovlivní startovní
            listinu žádné akce.
          </p>
          <BtnLink href="/admin/historie">Zpět na historii</BtnLink>
        </Card>
      )}
    </div>
  );
}
