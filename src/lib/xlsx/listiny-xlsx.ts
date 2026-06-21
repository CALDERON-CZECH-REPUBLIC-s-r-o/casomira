import "server-only";
import ExcelJS from "exceljs";
import {
  serazeneVysledky,
  startovniRadky,
  type SkupinaVysledku,
  type ZavodnikVysledek,
} from "@/domain/vysledky";
import { cistyCas, ztrata } from "@/lib/cas";
import type { DataAkce } from "@/lib/listiny-data";

const STAV_LABEL: Record<string, string> = {
  klasifikovan: "",
  DNF: "DNF",
  DNS: "DNS",
  DSQ: "DSQ",
  bez_casu: "—",
};

function bezpecnyNazevListu(s: string): string {
  // Excel: max 31 znaků, bez znaků : \ / ? * [ ]
  return s.replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || "List";
}

/** Startovní listina jako XLSX (list „Vše" + list na kategorii). */
export async function startovniXlsx(
  data: DataAkce,
  sort: "cislo" | "abeceda",
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Časomíra";

  const kategorieKod = new Map(
    data.kategorie.map((k) => [k.id, k.kod ?? k.nazev]),
  );
  const hlavicka = [
    "Číslo",
    "Příjmení",
    "Jméno",
    "Ročník",
    "Oddíl",
    "Město",
    "Kategorie",
  ];

  const napln = (ws: ExcelJS.Worksheet, zavodnici: ZavodnikVysledek[]) => {
    ws.addRow(hlavicka).font = { bold: true };
    for (const z of zavodnici) {
      ws.addRow([
        z.startovniCislo ?? "",
        z.prijmeni,
        z.jmeno,
        z.rokNarozeni ?? "",
        z.oddil ?? "",
        z.mesto ?? "",
        z.kategorieId ? kategorieKod.get(z.kategorieId) ?? "" : "",
      ]);
    }
    ws.columns.forEach((c) => (c.width = 14));
  };

  napln(wb.addWorksheet("Vše"), startovniRadky(data.zavodnici, sort));
  for (const kat of [...data.kategorie].sort((a, b) => a.poradi - b.poradi)) {
    const vKat = data.zavodnici.filter((z) => z.kategorieId === kat.id);
    if (vKat.length === 0) continue;
    napln(
      wb.addWorksheet(bezpecnyNazevListu(kat.kod ?? kat.nazev)),
      startovniRadky(vKat, sort),
    );
  }

  return (await wb.xlsx.writeBuffer()) as unknown as Uint8Array;
}

/** Výsledková listina jako XLSX (list „Celkově" + list na kategorii). */
export async function vysledkovaXlsx(data: DataAkce): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Časomíra";

  const vysledky = serazeneVysledky(
    data.zavodnici,
    data.zaznamy,
    data.akce.casStartu,
    data.kategorie,
  );
  const kategorieKod = new Map(
    data.kategorie.map((k) => [k.id, k.kod ?? k.nazev]),
  );
  const hlavicka = [
    "Pořadí",
    "Číslo",
    "Příjmení",
    "Jméno",
    "Ročník",
    "Oddíl",
    "Město",
    "Kategorie",
    "Čas",
    "Ztráta",
    "Stav",
  ];

  const napln = (ws: ExcelJS.Worksheet, sk: SkupinaVysledku) => {
    ws.addRow(hlavicka).font = { bold: true };
    for (const r of sk.radky) {
      const z = r.zavodnik;
      ws.addRow([
        r.poradi ?? "",
        z.startovniCislo ?? "",
        z.prijmeni,
        z.jmeno,
        z.rokNarozeni ?? "",
        z.oddil ?? "",
        z.mesto ?? "",
        z.kategorieId ? kategorieKod.get(z.kategorieId) ?? "" : "",
        r.stav === "klasifikovan" && r.cistyCasMs !== null
          ? cistyCas(r.cistyCasMs)
          : "",
        r.stav === "klasifikovan" ? (r.ztrataMs ? ztrata(r.ztrataMs) : "") : "",
        STAV_LABEL[r.stav] ?? "",
      ]);
    }
    ws.columns.forEach((c) => (c.width = 13));
  };

  napln(wb.addWorksheet("Celkově"), vysledky.celkova);
  for (const sk of vysledky.kategorie) {
    if (sk.radky.length === 0) continue;
    napln(
      wb.addWorksheet(
        bezpecnyNazevListu(sk.kategorie!.kod ?? sk.kategorie!.nazev),
      ),
      sk,
    );
  }

  return (await wb.xlsx.writeBuffer()) as unknown as Uint8Array;
}
