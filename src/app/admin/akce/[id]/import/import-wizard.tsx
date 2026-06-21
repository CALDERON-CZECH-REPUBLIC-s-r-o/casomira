"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { normalizujPohlavi, odhadniPohlaviZPrijmeni } from "@/lib/pohlavi";
import { rozdelJmeno, parseCislo } from "@/lib/import-helpers";
import {
  importovatZavodniky,
  type ImportZavodnik,
  type VysledekImportu,
} from "@/server/import";

type Bunky = (string | number)[][];
type CileKlic =
  | "cislo"
  | "prijmeni"
  | "jmeno"
  | "jmenoCele"
  | "rok"
  | "pohlavi"
  | "oddil"
  | "mesto";

const NEMAPOVANO = -1;

interface NahledRadek extends ImportZavodnik {
  index: number;
  chyba: string | null; // blokující (řádek se nevloží)
  varovani: string[]; // nezablokuje import
}

export function ImportWizard({
  akceId,
  akceRok,
}: {
  akceId: string;
  akceRok: number;
}) {
  const [nazvyListu, setNazvyListu] = useState<string[]>([]);
  const [listy, setListy] = useState<Record<string, Bunky>>({});
  const [aktivniList, setAktivniList] = useState<string>("");
  const [hlavickaRadek, setHlavickaRadek] = useState(0);
  const [mapovani, setMapovani] = useState<Record<CileKlic, number>>({
    cislo: NEMAPOVANO,
    prijmeni: NEMAPOVANO,
    jmeno: NEMAPOVANO,
    jmenoCele: NEMAPOVANO,
    rok: NEMAPOVANO,
    pohlavi: NEMAPOVANO,
    oddil: NEMAPOVANO,
    mesto: NEMAPOVANO,
  });
  const [sliteJmeno, setSliteJmeno] = useState(true);
  const [poradiJmena, setPoradiJmena] = useState<"PJ" | "JP">("PJ");
  const [heuristika, setHeuristika] = useState(false);
  const [vysledek, setVysledek] = useState<VysledekImportu | null>(null);
  const [pending, startTransition] = useTransition();
  const [chybaSouboru, setChybaSouboru] = useState<string | null>(null);

  const bunky = listy[aktivniList] ?? [];
  const sloupce = (bunky[hlavickaRadek] ?? []).map((h, i) => ({
    index: i,
    label: String(h ?? "").trim() || `Sloupec ${i + 1}`,
  }));
  const datoveRadky = bunky.slice(hlavickaRadek + 1);

  async function naSoubor(e: React.ChangeEvent<HTMLInputElement>) {
    setChybaSouboru(null);
    setVysledek(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
      const data: Record<string, Bunky> = {};
      for (const name of wb.SheetNames) {
        data[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {
          header: 1,
          raw: false,
          defval: "",
          blankrows: false,
        }) as Bunky;
      }
      setListy(data);
      setNazvyListu(wb.SheetNames);
      const prvni = wb.SheetNames[0] ?? "";
      setAktivniList(prvni);
      setHlavickaRadek(odhadniHlavicku(data[prvni] ?? []));
      autoMapuj(data[prvni] ?? [], odhadniHlavicku(data[prvni] ?? []));
    } catch {
      setChybaSouboru(
        "Soubor se nepodařilo načíst. Zkontroluj, že jde o .xls nebo .xlsx.",
      );
    }
  }

  function odhadniHlavicku(b: Bunky): number {
    // První řádek s ≥3 neprázdnými buňkami považujeme za hlavičku.
    for (let i = 0; i < Math.min(b.length, 15); i++) {
      const neprazdne = (b[i] ?? []).filter((c) => String(c).trim() !== "").length;
      if (neprazdne >= 3) return i;
    }
    return 0;
  }

  function autoMapuj(b: Bunky, hr: number) {
    const head = (b[hr] ?? []).map((h) => String(h).toLowerCase());
    const najdi = (vzory: string[]) =>
      head.findIndex((h) => vzory.some((v) => h.includes(v)));
    const m = { ...mapovani };
    const c = najdi(["č.", "cislo", "číslo", "st.č", "bib"]);
    const jmenoCele = najdi(["příjmení", "prijmeni", "jméno", "jmeno"]);
    const rok = najdi(["rok", "ročník", "rocnik", "nar"]);
    const pohl = najdi(["pohlaví", "pohlavi", "pohl"]);
    const oddil = najdi(["oddíl", "oddil", "klub", "tým", "tym"]);
    const mesto = najdi(["město", "mesto", "obec", "bydliště"]);
    if (c >= 0) m.cislo = c;
    if (jmenoCele >= 0) m.jmenoCele = jmenoCele;
    if (rok >= 0) m.rok = rok;
    if (pohl >= 0) m.pohlavi = pohl;
    if (oddil >= 0) m.oddil = oddil;
    if (mesto >= 0) m.mesto = mesto;
    setMapovani(m);
  }

  function zmenList(name: string) {
    setAktivniList(name);
    const b = listy[name] ?? [];
    const hr = odhadniHlavicku(b);
    setHlavickaRadek(hr);
    autoMapuj(b, hr);
  }

  const nahled = useMemo<NahledRadek[]>(() => {
    const out: NahledRadek[] = [];
    const videnaCisla = new Map<number, number>();

    for (let i = 0; i < datoveRadky.length; i++) {
      const r = datoveRadky[i];
      const get = (k: CileKlic) =>
        mapovani[k] === NEMAPOVANO ? "" : String(r[mapovani[k]] ?? "").trim();

      let prijmeni = "";
      let jmeno = "";
      if (sliteJmeno) {
        const rozd = rozdelJmeno(get("jmenoCele"), poradiJmena);
        prijmeni = rozd.prijmeni;
        jmeno = rozd.jmeno;
      } else {
        prijmeni = get("prijmeni");
        jmeno = get("jmeno");
      }

      // Přeskoč úplně prázdné řádky.
      if (
        prijmeni === "" &&
        jmeno === "" &&
        get("cislo") === "" &&
        get("rok") === ""
      ) {
        continue;
      }

      const startovniCislo = parseCislo(
        mapovani.cislo === NEMAPOVANO ? "" : (r[mapovani.cislo] as string),
      );
      const rokNarozeni = parseCislo(
        mapovani.rok === NEMAPOVANO ? "" : (r[mapovani.rok] as string),
      );
      let pohlavi = normalizujPohlavi(get("pohlavi"));
      if (pohlavi === null && heuristika) pohlavi = odhadniPohlaviZPrijmeni(prijmeni);

      const oddil = get("oddil") || null;
      const mesto = get("mesto") || null;

      const varovani: string[] = [];
      let chyba: string | null = null;
      if (prijmeni === "") chyba = "chybí příjmení";
      if (rokNarozeni !== null && (rokNarozeni < 1900 || rokNarozeni > akceRok))
        varovani.push("nevalidní ročník");
      if (rokNarozeni === null) varovani.push("bez ročníku");
      if (pohlavi === null) varovani.push("bez pohlaví");
      if (startovniCislo !== null) {
        videnaCisla.set(startovniCislo, (videnaCisla.get(startovniCislo) ?? 0) + 1);
      }

      out.push({
        index: i,
        startovniCislo,
        prijmeni,
        jmeno,
        rokNarozeni:
          rokNarozeni !== null && rokNarozeni >= 1900 && rokNarozeni <= akceRok
            ? rokNarozeni
            : null,
        pohlavi,
        oddil,
        mesto,
        chyba,
        varovani,
      });
    }

    // Duplicitní startovní čísla v rámci náhledu → blokující chyba.
    for (const r of out) {
      if (r.startovniCislo !== null && (videnaCisla.get(r.startovniCislo) ?? 0) > 1) {
        r.chyba = r.chyba ?? `duplicitní číslo ${r.startovniCislo}`;
      }
    }
    return out;
  }, [datoveRadky, mapovani, sliteJmeno, poradiJmena, heuristika, akceRok]);

  const platne = nahled.filter((r) => r.chyba === null);
  const chybne = nahled.filter((r) => r.chyba !== null);
  const bezPohlavi = platne.filter((r) => r.pohlavi === null).length;
  const bezCisla = platne.filter((r) => r.startovniCislo === null).length;

  function importuj() {
    setVysledek(null);
    const data: ImportZavodnik[] = platne.map((r) => ({
      startovniCislo: r.startovniCislo,
      prijmeni: r.prijmeni,
      jmeno: r.jmeno,
      rokNarozeni: r.rokNarozeni,
      pohlavi: r.pohlavi,
      oddil: r.oddil,
      mesto: r.mesto,
    }));
    startTransition(async () => {
      const res = await importovatZavodniky(akceId, data);
      setVysledek(res);
    });
  }

  function stahnoutSablonu() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Startovní číslo", "Příjmení", "Jméno", "Ročník", "Pohlaví", "Oddíl", "Město"],
      [1, "Novák", "Jan", 1990, "M", "SK Příklad", "Litoměřice"],
      [2, "Nováková", "Eva", 1995, "Z", "", "Ústí nad Labem"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Přihlášky");
    XLSX.writeFile(wb, "sablona-prihlasky.xlsx");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Krok 1: soubor */}
      <section className="rounded-md border p-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm font-medium">
            1. Vyber soubor s přihláškami
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={naSoubor}
              className="mt-2 block text-sm"
            />
          </label>
          <button
            type="button"
            onClick={stahnoutSablonu}
            className="shrink-0 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ↓ Stáhnout šablonu .xlsx
          </button>
        </div>
        {chybaSouboru && (
          <p className="mt-2 text-sm text-red-600">{chybaSouboru}</p>
        )}
      </section>

      {bunky.length > 0 && (
        <>
          {/* Krok 2: list + řádek hlavičky */}
          <section className="rounded-md border p-4">
            <h2 className="mb-3 text-sm font-medium">2. List a hlavička</h2>
            <div className="flex flex-wrap items-end gap-4">
              {nazvyListu.length > 1 && (
                <label className="flex flex-col gap-1 text-sm">
                  List
                  <select
                    value={aktivniList}
                    onChange={(e) => zmenList(e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1.5"
                  >
                    {nazvyListu.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1 text-sm">
                Řádek hlavičky
                <select
                  value={hlavickaRadek}
                  onChange={(e) => {
                    const hr = Number(e.target.value);
                    setHlavickaRadek(hr);
                    autoMapuj(bunky, hr);
                  }}
                  className="rounded-md border border-gray-300 px-2 py-1.5"
                >
                  {bunky.slice(0, 15).map((_, i) => (
                    <option key={i} value={i}>
                      Řádek {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-gray-500">
                Náhled hlavičky:{" "}
                {sloupce.map((s) => s.label).join(" · ") || "—"}
              </p>
            </div>
          </section>

          {/* Krok 3: mapování */}
          <section className="rounded-md border p-4">
            <h2 className="mb-3 text-sm font-medium">3. Přiřaď sloupce</h2>
            <div className="mb-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sliteJmeno}
                  onChange={(e) => setSliteJmeno(e.target.checked)}
                />
                Příjmení a jméno v jednom sloupci
              </label>
              {sliteJmeno && (
                <label className="flex items-center gap-2">
                  Pořadí:
                  <select
                    value={poradiJmena}
                    onChange={(e) =>
                      setPoradiJmena(e.target.value as "PJ" | "JP")
                    }
                    className="rounded-md border border-gray-300 px-2 py-1"
                  >
                    <option value="PJ">Příjmení Jméno</option>
                    <option value="JP">Jméno Příjmení</option>
                  </select>
                </label>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={heuristika}
                  onChange={(e) => setHeuristika(e.target.checked)}
                />
                Doplnit chybějící pohlaví z příjmení (-á → žena)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <MapPole
                label="Startovní číslo"
                value={mapovani.cislo}
                sloupce={sloupce}
                onChange={(v) => setMapovani((m) => ({ ...m, cislo: v }))}
              />
              {sliteJmeno ? (
                <MapPole
                  label="Příjmení a jméno"
                  value={mapovani.jmenoCele}
                  sloupce={sloupce}
                  onChange={(v) => setMapovani((m) => ({ ...m, jmenoCele: v }))}
                />
              ) : (
                <>
                  <MapPole
                    label="Příjmení"
                    value={mapovani.prijmeni}
                    sloupce={sloupce}
                    onChange={(v) => setMapovani((m) => ({ ...m, prijmeni: v }))}
                  />
                  <MapPole
                    label="Jméno"
                    value={mapovani.jmeno}
                    sloupce={sloupce}
                    onChange={(v) => setMapovani((m) => ({ ...m, jmeno: v }))}
                  />
                </>
              )}
              <MapPole
                label="Ročník narození"
                value={mapovani.rok}
                sloupce={sloupce}
                onChange={(v) => setMapovani((m) => ({ ...m, rok: v }))}
              />
              <MapPole
                label="Pohlaví"
                value={mapovani.pohlavi}
                sloupce={sloupce}
                onChange={(v) => setMapovani((m) => ({ ...m, pohlavi: v }))}
              />
              <MapPole
                label="Oddíl"
                value={mapovani.oddil}
                sloupce={sloupce}
                onChange={(v) => setMapovani((m) => ({ ...m, oddil: v }))}
              />
              <MapPole
                label="Město"
                value={mapovani.mesto}
                sloupce={sloupce}
                onChange={(v) => setMapovani((m) => ({ ...m, mesto: v }))}
              />
            </div>
          </section>

          {/* Krok 4: náhled */}
          <section className="rounded-md border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium">4. Náhled a validace</h2>
              <div className="flex flex-wrap gap-3 text-xs">
                <Znacka barva="green">{platne.length} k importu</Znacka>
                {chybne.length > 0 && (
                  <Znacka barva="red">{chybne.length} s chybou (vynechány)</Znacka>
                )}
                {bezPohlavi > 0 && (
                  <Znacka barva="amber">{bezPohlavi} bez pohlaví</Znacka>
                )}
                {bezCisla > 0 && (
                  <Znacka barva="amber">{bezCisla} bez čísla</Znacka>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b bg-white text-left text-gray-500">
                  <tr>
                    <th className="py-1">Č.</th>
                    <th>Příjmení</th>
                    <th>Jméno</th>
                    <th>Ročník</th>
                    <th>Pohl.</th>
                    <th>Oddíl</th>
                    <th>Město</th>
                    <th>Stav</th>
                  </tr>
                </thead>
                <tbody>
                  {nahled.slice(0, 300).map((r) => (
                    <tr
                      key={r.index}
                      className={`border-b last:border-0 ${r.chyba ? "bg-red-50" : ""}`}
                    >
                      <td className="py-1">{r.startovniCislo ?? "—"}</td>
                      <td>{r.prijmeni || <span className="text-red-500">—</span>}</td>
                      <td>{r.jmeno || "—"}</td>
                      <td>{r.rokNarozeni ?? "—"}</td>
                      <td className={r.pohlavi ? "" : "text-amber-600"}>
                        {r.pohlavi ?? "?"}
                      </td>
                      <td>{r.oddil ?? "—"}</td>
                      <td>{r.mesto ?? "—"}</td>
                      <td className="text-xs">
                        {r.chyba ? (
                          <span className="text-red-600">{r.chyba}</span>
                        ) : r.varovani.length ? (
                          <span className="text-amber-600">
                            {r.varovani.join(", ")}
                          </span>
                        ) : (
                          <span className="text-green-600">ok</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {nahled.length > 300 && (
                <p className="mt-2 text-xs text-gray-500">
                  Zobrazeno prvních 300 z {nahled.length} řádků.
                </p>
              )}
            </div>
          </section>

          {/* Krok 5: import */}
          <section className="flex items-center gap-4">
            <button
              type="button"
              onClick={importuj}
              disabled={pending || platne.length === 0}
              className="rounded-md bg-black px-4 py-2 font-medium text-white disabled:opacity-40"
            >
              {pending
                ? "Importuji…"
                : `Importovat ${platne.length} závodníků`}
            </button>
            {vysledek && (
              <div className="text-sm">
                {vysledek.ok ? (
                  <span className="text-green-700">
                    Hotovo: vloženo {vysledek.vlozeno}
                    {vysledek.nezarazeno > 0
                      ? `, z toho ${vysledek.nezarazeno} bez kategorie`
                      : ""}
                    .{" "}
                    <Link
                      href={`/admin/akce/${akceId}/zavodnici`}
                      className="text-blue-600 underline"
                    >
                      Zobrazit závodníky →
                    </Link>
                  </span>
                ) : (
                  <span className="text-red-600">
                    {vysledek.chyby.join(" ")}
                  </span>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MapPole({
  label,
  value,
  sloupce,
  onChange,
}: {
  label: string;
  value: number;
  sloupce: { index: number; label: string }[];
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-gray-300 px-2 py-1.5"
      >
        <option value={NEMAPOVANO}>— nemapováno —</option>
        {sloupce.map((s) => (
          <option key={s.index} value={s.index}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Znacka({
  barva,
  children,
}: {
  barva: "green" | "red" | "amber";
  children: React.ReactNode;
}) {
  const cls = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800",
  }[barva];
  return (
    <span className={`rounded-full px-2 py-0.5 ${cls}`}>{children}</span>
  );
}
