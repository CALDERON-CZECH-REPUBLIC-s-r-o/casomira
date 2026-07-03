import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT } from "@/db/schema";
import { nactiDataAkce } from "@/lib/listiny-data";
import {
  serazeneVysledky,
  startovniRadky,
  oddilNeboMesto,
  type VysledekRadek,
  type SkupinaVysledku,
  type ZavodnikVysledek,
} from "@/domain/vysledky";

/** Serializovatelný tvar pro veřejný web (posílá se i v polling JSON). */
export interface VerejnyRadek {
  id: string;
  poradi: number | null;
  cislo: number | null;
  prijmeni: string;
  jmeno: string;
  rocnik: number | null;
  oddil: string;
  casMs: number | null;
  ztrataMs: number | null;
  stav: VysledekRadek["stav"];
}

export interface VerejnaSkupina {
  kod: string | null;
  nazev: string;
  klasifikovano: number;
  dnf: number;
  dns: number;
  dsq: number;
  radky: VerejnyRadek[];
}

export interface VerejnyStartRadek {
  id: string;
  cislo: number | null;
  prijmeni: string;
  jmeno: string;
  rocnik: number | null;
  oddil: string;
  kategorieKod: string | null;
}

export interface VerejnaData {
  akce: {
    nazev: string;
    datum: string;
    misto: string | null;
    slug: string;
    bezi: boolean; // start nastaven
    aktualizovano: string; // ISO
  };
  vysledky: {
    celkova: VerejnaSkupina;
    kategorie: VerejnaSkupina[];
  };
  startovni: {
    celkova: VerejnyStartRadek[];
    kategorie: { kod: string | null; nazev: string; zavodnici: VerejnyStartRadek[] }[];
  };
}

function radekSerial(r: VysledekRadek): VerejnyRadek {
  return {
    id: r.zavodnik.id,
    poradi: r.poradi,
    cislo: r.zavodnik.startovniCislo,
    prijmeni: r.zavodnik.prijmeni,
    jmeno: r.zavodnik.jmeno,
    rocnik: r.zavodnik.rokNarozeni,
    oddil: oddilNeboMesto(r.zavodnik),
    casMs: r.cistyCasMs,
    ztrataMs: r.ztrataMs,
    stav: r.stav,
  };
}

function skupinaSerial(sk: SkupinaVysledku): VerejnaSkupina {
  return {
    kod: sk.kategorie?.kod ?? null,
    nazev: sk.kategorie?.nazev ?? "Celkově",
    klasifikovano: sk.klasifikovano,
    dnf: sk.dnf,
    dns: sk.dns,
    dsq: sk.dsq,
    radky: sk.radky.map(radekSerial),
  };
}

function startSerial(
  z: ZavodnikVysledek,
  kategorieKod: Map<string, string>,
): VerejnyStartRadek {
  return {
    id: z.id,
    cislo: z.startovniCislo,
    prijmeni: z.prijmeni,
    jmeno: z.jmeno,
    rocnik: z.rokNarozeni,
    oddil: oddilNeboMesto(z),
    kategorieKod: z.kategorieId ? kategorieKod.get(z.kategorieId) ?? null : null,
  };
}

/** Načte a sestaví veřejná data akce dle slugu (null = neexistuje). */
export async function nactiVerejnaData(
  slug: string,
): Promise<VerejnaData | null> {
  const akce = await db.query.akce.findFirst({ where: eq(akceT.slug, slug) });
  if (!akce) return null;
  if (!akce.verejna) return null; // skrytá akce → 404 / prázdné API
  const data = await nactiDataAkce(akce.id);
  if (!data) return null;

  const kategorieKod = new Map(
    data.kategorie.map((k) => [k.id, k.kod ?? k.nazev]),
  );
  const katSerazene = [...data.kategorie].sort((a, b) => a.poradi - b.poradi);

  const vys = serazeneVysledky(
    data.zavodnici,
    data.zaznamy,
    data.akce.casStartu,
    data.kategorie,
  );

  return {
    akce: {
      nazev: data.akce.nazev,
      datum: data.akce.datum,
      misto: data.akce.misto,
      slug: data.akce.slug,
      bezi: data.akce.casStartu !== null,
      aktualizovano: new Date().toISOString(),
    },
    vysledky: {
      celkova: skupinaSerial(vys.celkova),
      kategorie: vys.kategorie
        .filter((sk) => sk.radky.length > 0)
        .map(skupinaSerial),
    },
    startovni: {
      celkova: startovniRadky(data.zavodnici, "cislo").map((z) =>
        startSerial(z, kategorieKod),
      ),
      kategorie: katSerazene
        .map((k) => ({
          kod: k.kod,
          nazev: k.nazev,
          zavodnici: startovniRadky(
            data.zavodnici.filter((z) => z.kategorieId === k.id),
            "cislo",
          ).map((z) => startSerial(z, kategorieKod)),
        }))
        .filter((s) => s.zavodnici.length > 0),
    },
  };
}
