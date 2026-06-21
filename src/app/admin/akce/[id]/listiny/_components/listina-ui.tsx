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
    <header className="mb-4">
      <h1 className="text-xl font-bold">{nazev}</h1>
      <p className="text-sm text-gray-600">
        {datumCz}
        {misto ? ` · ${misto}` : ""}
      </p>
      <h2 className="mt-1 text-lg font-semibold">
        {typ}
        {podtitul ? <span className="font-normal"> — {podtitul}</span> : null}
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
        <tr className="border-b-2 border-gray-700 text-left">
          <th className="py-1 pr-2">Číslo</th>
          <th className="pr-2">Příjmení</th>
          <th className="pr-2">Jméno</th>
          <th className="pr-2">Roč.</th>
          <th className="pr-2">Oddíl / Město</th>
          {kategorieKod && <th className="pr-2">Kat.</th>}
        </tr>
      </thead>
      <tbody>
        {zavodnici.map((z, i) => (
          <tr key={z.id} className={i % 2 ? "bg-gray-50 print:bg-gray-100" : ""}>
            <td className="py-0.5 pr-2 tabular-nums">
              {z.startovniCislo ?? "—"}
            </td>
            <td className="pr-2 font-medium">{z.prijmeni}</td>
            <td className="pr-2">{z.jmeno}</td>
            <td className="pr-2 tabular-nums">{z.rokNarozeni ?? "—"}</td>
            <td className="pr-2">{oddilNeboMesto(z) || "—"}</td>
            {kategorieKod && (
              <td className="pr-2">
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
        <tr className="border-b-2 border-gray-700 text-left">
          <th className="py-1 pr-2">Poř.</th>
          <th className="pr-2">Číslo</th>
          <th className="pr-2">Příjmení</th>
          <th className="pr-2">Jméno</th>
          <th className="pr-2">Roč.</th>
          <th className="pr-2">Oddíl / Město</th>
          {kategorieKod && <th className="pr-2">Kat.</th>}
          <th className="pr-2 text-right">Čas</th>
          <th className="pr-2 text-right">Ztráta</th>
        </tr>
      </thead>
      <tbody>
        {radky.map((r, i) => {
          const z = r.zavodnik;
          const nedobehl = r.stav !== "klasifikovan";
          return (
            <tr
              key={z.id}
              className={`${i % 2 ? "bg-gray-50 print:bg-gray-100" : ""} ${nedobehl ? "text-gray-500" : ""}`}
            >
              <td className="py-0.5 pr-2 tabular-nums">{r.poradi ?? ""}</td>
              <td className="pr-2 tabular-nums">{z.startovniCislo ?? "—"}</td>
              <td className="pr-2 font-medium">{z.prijmeni}</td>
              <td className="pr-2">{z.jmeno}</td>
              <td className="pr-2 tabular-nums">{z.rokNarozeni ?? "—"}</td>
              <td className="pr-2">{oddilNeboMesto(z) || "—"}</td>
              {kategorieKod && (
                <td className="pr-2">
                  {z.kategorieId ? kategorieKod.get(z.kategorieId) ?? "—" : "—"}
                </td>
              )}
              <td className="pr-2 text-right tabular-nums">
                {r.stav === "klasifikovan" && r.cistyCasMs !== null
                  ? cistyCas(r.cistyCasMs)
                  : STAV_LABEL[r.stav] ?? "—"}
              </td>
              <td className="pr-2 text-right tabular-nums">
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
    <h3 className="mb-1 mt-4 border-b border-gray-400 pb-0.5 text-base font-semibold">
      {kategorie.kod ? `${kategorie.kod} — ` : ""}
      {kategorie.nazev}
      {souhrn && (
        <span className="ml-2 text-xs font-normal text-gray-500">
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
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        h3 { break-after: avoid; }
        tr { break-inside: avoid; }
      }
    `}</style>
  );
}
