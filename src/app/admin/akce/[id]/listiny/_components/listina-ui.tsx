import {
  oddilNeboMesto,
  type VysledekRadek,
  type ZavodnikVysledek,
  type KategorieVysledek,
} from "@/domain/vysledky";
import { cistyCas, ztrata } from "@/lib/cas";

/** Hlavička listiny — název akce, datum/místo, typ listiny. */
export function ListinaHlavicka({
  nazev,
  datum,
  misto,
  typ,
  podtitul,
}: {
  nazev: string;
  datum: string;
  misto: string | null;
  typ: string;
  podtitul?: string;
}) {
  const d = new Date(datum + "T00:00:00");
  const datumCz = `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
  return (
    <header className="mb-5 border-b-2 border-ink-800 pb-3">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{nazev}</h1>
        <span className="flex-none font-technical text-[12px] tabular-nums text-ink-500">
          {datumCz}
          {misto ? ` · ${misto}` : ""}
        </span>
      </div>
      <h2 className="mt-1.5 flex items-baseline gap-2">
        <span className="text-lg font-semibold text-teal-700">{typ}</span>
        {podtitul ? (
          <span className="font-technical text-[12px] text-ink-500">— {podtitul}</span>
        ) : null}
      </h2>
    </header>
  );
}

const STAV_LABEL: Record<string, string> = {
  DNF: "DNF",
  DNS: "DNS",
  DSQ: "DSQ",
  bez_casu: "—",
};

export function StartovniTabulka({
  zavodnici,
  kategorieKod,
}: {
  zavodnici: ZavodnikVysledek[];
  kategorieKod?: Map<string, string>;
}) {
  return (
    <table className="mb-6 w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-ink-800 text-left">
          <th className="py-1.5 pr-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Číslo
          </th>
          <th className="pr-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Příjmení
          </th>
          <th className="pr-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Jméno
          </th>
          <th className="pr-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Roč.
          </th>
          <th className="pr-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Oddíl / Město
          </th>
          {kategorieKod && (
            <th className="pr-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">
              Kat.
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {zavodnici.map((z, i) => (
          <tr
            key={z.id}
            className={`border-b border-ink-100 ${i % 2 ? "bg-ink-50 print:bg-ink-100" : ""}`}
          >
            <td className="py-1 pr-3 font-technical tabular-nums text-ink-700">
              {z.startovniCislo ?? "—"}
            </td>
            <td className="pr-3 font-semibold text-ink-900">{z.prijmeni}</td>
            <td className="pr-3 text-ink-700">{z.jmeno}</td>
            <td className="pr-3 font-technical tabular-nums text-ink-600">
              {z.rokNarozeni ?? "—"}
            </td>
            <td className="pr-3 text-ink-600">{oddilNeboMesto(z) || "—"}</td>
            {kategorieKod && (
              <td className="pr-3 font-technical text-ink-600">
                {z.kategorieId ? kategorieKod.get(z.kategorieId) ?? "—" : "—"}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function VysledkovaTabulka({
  radky,
  kategorieKod,
}: {
  radky: VysledekRadek[];
  kategorieKod?: Map<string, string>;
}) {
  return (
    <table className="mb-6 w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-ink-800 text-left">
          {["Poř.", "Číslo", "Příjmení", "Jméno", "Roč.", "Oddíl / Město"].map(
            (h) => (
              <th
                key={h}
                className="py-1.5 pr-3 text-[11px] font-medium uppercase tracking-wider text-ink-500"
              >
                {h}
              </th>
            ),
          )}
          {kategorieKod && (
            <th className="pr-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">
              Kat.
            </th>
          )}
          <th className="pr-3 text-right text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Čas
          </th>
          <th className="pr-3 text-right text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Ztráta
          </th>
        </tr>
      </thead>
      <tbody>
        {radky.map((r, i) => {
          const z = r.zavodnik;
          const nedobehl = r.stav !== "klasifikovan";
          return (
            <tr
              key={z.id}
              className={`border-b border-ink-100 ${i % 2 ? "bg-ink-50 print:bg-ink-100" : ""} ${nedobehl ? "text-ink-400" : ""}`}
            >
              <td
                className={`py-1 pr-3 font-technical tabular-nums ${nedobehl ? "" : "font-semibold text-teal-700"}`}
              >
                {r.poradi ?? ""}
              </td>
              <td className="pr-3 font-technical tabular-nums text-ink-700">
                {z.startovniCislo ?? "—"}
              </td>
              <td
                className={`pr-3 font-semibold ${nedobehl ? "" : "text-ink-900"}`}
              >
                {z.prijmeni}
              </td>
              <td className={`pr-3 ${nedobehl ? "" : "text-ink-700"}`}>
                {z.jmeno}
              </td>
              <td className="pr-3 font-technical tabular-nums text-ink-600">
                {z.rokNarozeni ?? "—"}
              </td>
              <td className={`pr-3 ${nedobehl ? "" : "text-ink-600"}`}>
                {oddilNeboMesto(z) || "—"}
              </td>
              {kategorieKod && (
                <td className="pr-3 font-technical text-ink-600">
                  {z.kategorieId ? kategorieKod.get(z.kategorieId) ?? "—" : "—"}
                </td>
              )}
              <td
                className={`pr-3 text-right font-technical tabular-nums ${nedobehl ? "text-ink-400" : "font-semibold text-ink-900"}`}
              >
                {r.stav === "klasifikovan" && r.cistyCasMs !== null
                  ? cistyCas(r.cistyCasMs)
                  : STAV_LABEL[r.stav] ?? "—"}
              </td>
              <td className="pr-3 text-right font-technical tabular-nums text-ink-500">
                {r.stav === "klasifikovan" ? ztrata(r.ztrataMs) : ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Nadpis sekce kategorie + souhrn. */
export function SekceHlavicka({
  kategorie,
  souhrn,
}: {
  kategorie: KategorieVysledek;
  souhrn?: { klasifikovano: number; dnf: number; dns: number; dsq: number };
}) {
  return (
    <h3 className="mb-1.5 mt-6 flex items-baseline gap-2 border-b border-ink-200 pb-1 text-base">
      {kategorie.kod && (
        <span className="font-technical font-medium text-teal-600">
          {kategorie.kod}
        </span>
      )}
      <span className="font-semibold text-ink-900">{kategorie.nazev}</span>
      {souhrn && (
        <span className="ml-auto font-technical text-[11px] font-normal text-ink-500">
          {souhrn.klasifikovano} klasifikováno
          {souhrn.dnf ? ` · ${souhrn.dnf} DNF` : ""}
          {souhrn.dns ? ` · ${souhrn.dns} DNS` : ""}
          {souhrn.dsq ? ` · ${souhrn.dsq} DSQ` : ""}
        </span>
      )}
    </h3>
  );
}

/** Styl tiskové stránky (A4) — vloží se do listiny. */
export function TiskStyl() {
  return (
    <style>{`
      @page { size: A4; margin: 12mm; }
      @media print {
        body {
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        h3 { break-after: avoid; }
        tr { break-inside: avoid; }
      }
    `}</style>
  );
}
