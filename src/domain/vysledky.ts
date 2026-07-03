/**
 * Odvození výsledků a startovních řádků ze surových dat.
 *
 * Výsledky se NEUKLÁDAJÍ natvrdo — odvozují se zde z `cilovy_zaznam` ↔ `zavodnik`
 * (SPEC). Čistý čas = `cas_cile − start`, kde start = `kategorie.cas_startu`,
 * jinak `akce.cas_startu`. Stejnou vrstvu konzumují HTML tisk, PDF i XLSX i veřejný web.
 */

export type StavVysledku =
  | "klasifikovan"
  | "DNF"
  | "DNS"
  | "DSQ"
  | "bez_casu";

export interface ZavodnikVysledek {
  id: string;
  jmeno: string;
  prijmeni: string;
  rokNarozeni: number | null;
  startovniCislo: number | null;
  oddil: string | null;
  mesto: string | null;
  kategorieId: string | null;
  stav: "prihlasen" | "nenastoupil_DNS" | "diskvalifikovan_DSQ";
  // Importovaný čistý čas (historické výsledky) — má přednost před měřením.
  cistyCasImportMs?: number | null;
}

export interface ZaznamVysledek {
  zavodnikId: string | null;
  casCile: Date | string;
  stav: "platny" | "neprirazeno" | "smazany" | "DNF";
  // Měřicí bod průchodu; NULL/undefined = klasické cílové měření.
  bodId?: string | null;
}

export interface KategorieVysledek {
  id: string;
  nazev: string;
  kod: string | null;
  poradi: number;
  casStartu: Date | string | null;
}

export interface VysledekRadek {
  zavodnik: ZavodnikVysledek;
  poradi: number | null;
  cistyCasMs: number | null;
  ztrataMs: number | null;
  stav: StavVysledku;
}

export interface SkupinaVysledku {
  kategorie: KategorieVysledek | null; // null = celková
  radky: VysledekRadek[];
  klasifikovano: number;
  dnf: number;
  dns: number;
  dsq: number;
}

function ms(d: Date | string): number {
  return typeof d === "string" ? new Date(d).getTime() : d.getTime();
}

/** Start platný pro závodníka (start kategorie, jinak akce). null = bez startu. */
function startMsProZavodnika(
  z: ZavodnikVysledek,
  kategorieMap: Map<string, KategorieVysledek>,
  akceStart: Date | string | null,
): number | null {
  const kat = z.kategorieId ? kategorieMap.get(z.kategorieId) : undefined;
  const start = kat?.casStartu ?? akceStart;
  return start ? ms(start) : null;
}

/**
 * Surový stav + čistý čas jednoho závodníka.
 * - DNS/DSQ ze stavu závodníka
 * - DNF, pokud má jen DNF záznam (a žádný platný)
 * - klasifikován = nejdřívější `platny` záznam a je nastaven start
 * - jinak bez_casu (nedoběhl / není start)
 */
/**
 * Je průchod cílový? Bez cílové brány (finishBodId=null) je cílem každý platný
 * průchod (zpětná kompatibilita). S cílovou bránou počítá průchody v ní; průchody
 * bez bodu (legacy) bereme také jako cíl, mezičasové brány NE.
 */
function jeCilovy(r: ZaznamVysledek, finishBodId: string | null): boolean {
  if (finishBodId === null) return true;
  const bod = r.bodId ?? null;
  return bod === finishBodId || bod === null;
}

function vypoctiRadek(
  z: ZavodnikVysledek,
  zaznamyZavodnika: ZaznamVysledek[],
  startMs: number | null,
  finishBodId: string | null,
): { stav: StavVysledku; cistyCasMs: number | null } {
  if (z.stav === "nenastoupil_DNS") return { stav: "DNS", cistyCasMs: null };
  if (z.stav === "diskvalifikovan_DSQ") return { stav: "DSQ", cistyCasMs: null };

  // Historický import: uložený čistý čas má přednost (bez měření/startu).
  if (z.cistyCasImportMs != null) {
    return { stav: "klasifikovan", cistyCasMs: z.cistyCasImportMs };
  }

  const platne = zaznamyZavodnika
    .filter((r) => r.stav === "platny" && jeCilovy(r, finishBodId))
    .map((r) => ms(r.casCile))
    .sort((a, b) => a - b);

  if (platne.length > 0 && startMs !== null) {
    return { stav: "klasifikovan", cistyCasMs: platne[0] - startMs };
  }

  const maDnf = zaznamyZavodnika.some((r) => r.stav === "DNF");
  if (maDnf) return { stav: "DNF", cistyCasMs: null };

  return { stav: "bez_casu", cistyCasMs: null };
}

const PORADI_STAVU: Record<StavVysledku, number> = {
  klasifikovan: 0,
  DNF: 1,
  DNS: 2,
  DSQ: 3,
  bez_casu: 4,
};

/**
 * Seřadí skupinu: klasifikovaní dle času (shodné časy = stejné pořadí,
 * další pořadí přeskočí), pak DNF/DNS/DSQ/bez_casu abecedně. Doplní ztrátu na vítěze.
 */
function serazSkupinu(
  surove: { zavodnik: ZavodnikVysledek; stav: StavVysledku; cistyCasMs: number | null }[],
): VysledekRadek[] {
  const klasif = surove
    .filter((r) => r.stav === "klasifikovan" && r.cistyCasMs !== null)
    .sort((a, b) => a.cistyCasMs! - b.cistyCasMs!);

  const vitez = klasif.length > 0 ? klasif[0].cistyCasMs! : null;

  const klasifRadky: VysledekRadek[] = klasif.map((r, i) => {
    const poradi =
      i > 0 && r.cistyCasMs === klasif[i - 1].cistyCasMs
        ? // stejný čas jako předchozí → stejné pořadí
          undefined
        : i + 1;
    return {
      zavodnik: r.zavodnik,
      poradi: poradi ?? null, // dočasně, doplníme níže
      cistyCasMs: r.cistyCasMs,
      ztrataMs: vitez !== null ? r.cistyCasMs! - vitez : null,
      stav: "klasifikovan",
    };
  });
  // Doplnění pořadí u shodných časů (zděděné po předchozím).
  for (let i = 0; i < klasifRadky.length; i++) {
    if (klasifRadky[i].poradi === null) {
      klasifRadky[i].poradi = klasifRadky[i - 1].poradi;
    }
  }

  const ostatni: VysledekRadek[] = surove
    .filter((r) => r.stav !== "klasifikovan")
    .sort(
      (a, b) =>
        PORADI_STAVU[a.stav] - PORADI_STAVU[b.stav] ||
        a.zavodnik.prijmeni.localeCompare(b.zavodnik.prijmeni, "cs"),
    )
    .map((r) => ({
      zavodnik: r.zavodnik,
      poradi: null,
      cistyCasMs: null,
      ztrataMs: null,
      stav: r.stav,
    }));

  return [...klasifRadky, ...ostatni];
}

function souhrn(radky: VysledekRadek[]): Omit<SkupinaVysledku, "kategorie" | "radky"> {
  return {
    klasifikovano: radky.filter((r) => r.stav === "klasifikovan").length,
    dnf: radky.filter((r) => r.stav === "DNF").length,
    dns: radky.filter((r) => r.stav === "DNS").length,
    dsq: radky.filter((r) => r.stav === "DSQ").length,
  };
}

/**
 * Výsledky po kategoriích (řazené dle `poradi` kategorie) + celková skupina.
 */
export function serazeneVysledky(
  zavodnici: ZavodnikVysledek[],
  zaznamy: ZaznamVysledek[],
  akceStart: Date | string | null,
  kategorie: KategorieVysledek[],
  body: { id: string; jeCil: boolean }[] = [],
): { kategorie: SkupinaVysledku[]; celkova: SkupinaVysledku } {
  const kategorieMap = new Map(kategorie.map((k) => [k.id, k]));
  const finishBodId = body.find((b) => b.jeCil)?.id ?? null;

  // Záznamy podle závodníka.
  const dleZavodnika = new Map<string, ZaznamVysledek[]>();
  for (const r of zaznamy) {
    if (!r.zavodnikId || r.stav === "smazany" || r.stav === "neprirazeno") continue;
    const arr = dleZavodnika.get(r.zavodnikId) ?? [];
    arr.push(r);
    dleZavodnika.set(r.zavodnikId, arr);
  }

  const surove = zavodnici.map((z) => {
    const startMs = startMsProZavodnika(z, kategorieMap, akceStart);
    const { stav, cistyCasMs } = vypoctiRadek(
      z,
      dleZavodnika.get(z.id) ?? [],
      startMs,
      finishBodId,
    );
    return { zavodnik: z, stav, cistyCasMs };
  });

  const skupiny: SkupinaVysledku[] = [...kategorie]
    .sort((a, b) => a.poradi - b.poradi)
    .map((kat) => {
      const radky = serazSkupinu(surove.filter((r) => r.zavodnik.kategorieId === kat.id));
      return { kategorie: kat, radky, ...souhrn(radky) };
    });

  const celkoveRadky = serazSkupinu(surove);
  const celkova: SkupinaVysledku = {
    kategorie: null,
    radky: celkoveRadky,
    ...souhrn(celkoveRadky),
  };

  return { kategorie: skupiny, celkova };
}

/**
 * Startovní řádky: dle čísla (nezadané na konec) nebo abecedně (příjmení, jméno).
 */
export function startovniRadky(
  zavodnici: ZavodnikVysledek[],
  sort: "cislo" | "abeceda",
): ZavodnikVysledek[] {
  const kopie = [...zavodnici];
  if (sort === "abeceda") {
    kopie.sort(
      (a, b) =>
        a.prijmeni.localeCompare(b.prijmeni, "cs") ||
        a.jmeno.localeCompare(b.jmeno, "cs"),
    );
  } else {
    kopie.sort((a, b) => {
      if (a.startovniCislo === null) return 1;
      if (b.startovniCislo === null) return -1;
      return a.startovniCislo - b.startovniCislo;
    });
  }
  return kopie;
}

/** Oddíl, jinak město (jeden sloupec dle rozhodnutí). */
export function oddilNeboMesto(z: ZavodnikVysledek): string {
  return z.oddil || z.mesto || "";
}
