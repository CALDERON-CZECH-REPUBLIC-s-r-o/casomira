import { z } from "zod";

/**
 * Obsah (texty) marketingové landing page `/`. Uložen v DB (`web_obsah`, klíč
 * `landing`) jako JSON, editovatelný z administrace (`/admin/obsah`). Když řádek
 * v DB chybí nebo je neúplný, `slouciObsah()` doplní vše z `VYCHOZI_OBSAH` —
 * landing je tak odolná i po přidání nových polí do modelu.
 *
 * Editovatelné jsou POUZE texty. Struktura (ikony funkcí, cílové odkazy sekcí,
 * pořadí bloků) je pevná v kódu.
 */

export type Dukaz = { cislo: string; popis: string };
export type Funkce = { titul: string; popis: string }; // ikona dle pořadí (timer/upload/zap/file-text)
export type Krok = { cislo: string; titul: string; popis: string };
export type Tarif = {
  nazev: string;
  cena: string;
  obdobi: string;
  popis: string;
  badge: string; // prázdné = bez odznaku
  polozky: string[];
  cta: string;
};
export type FaqPolozka = { otazka: string; odpoved: string };

export type LandingObsah = {
  kontaktEmail: string;
  nav: {
    funkce: string;
    jak: string;
    cenik: string;
    divaci: string;
    prihlasit: string;
    cta: string;
  };
  hero: {
    eyebrow: string;
    h1a: string;
    h1b: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    note: string;
    mockEyebrow: string;
    mockTitul: string;
    mockPaticka: string;
  };
  dukazy: Dukaz[];
  funkce: { eyebrow: string; h2: string; karty: Funkce[] };
  jak: { eyebrow: string; h2: string; kroky: Krok[] };
  divaci: { eyebrow: string; h2: string; popis: string; urlPill: string };
  cenik: {
    eyebrow: string;
    h2: string;
    uvod: string;
    tarify: Tarif[];
    poznamka: string;
  };
  faq: {
    eyebrow: string;
    h2: string;
    popis: string;
    cta: string;
    polozky: FaqPolozka[];
  };
  ctaFinal: { h2: string; popis: string; cta: string };
  paticka: { dokumentace: string; kontakt: string; podminky: string };
};

/** Výchozí texty — přesně dle prototypu (handoff, blok 22a). */
export const VYCHOZI_OBSAH: LandingObsah = {
  kontaktEmail: "info@casomir.cz",
  nav: {
    funkce: "Funkce",
    jak: "Jak to funguje",
    cenik: "Ceník",
    divaci: "Pro diváky",
    prihlasit: "Přihlásit se",
    cta: "Založit závod zdarma",
  },
  hero: {
    eyebrow: "Měření běžeckých závodů",
    h1a: "Změřte závod.",
    h1b: "Stačí notebook.",
    sub: "Přihlášky nahrajete z Excelu, cíl odbavíte jedním ťuknutím a diváci vidí pořadí živě na mobilu. Bez drahé techniky — a funguje i bez signálu.",
    ctaPrimary: "Založit závod zdarma",
    ctaSecondary: "Živá ukázka výsledků",
    note: "Běží v prohlížeči, bez instalace. Zdarma pro závody do 200 startujících.",
    mockEyebrow: "Cílová obrazovka",
    mockTitul: "Jarní běh Lipová · 1,5 km",
    mockPaticka: "6/10 doběhlo · ťukni číslo — uloží se čas",
  },
  dukazy: [
    { cislo: "0", popis: "ztracených průchodů — razítko času se uloží v zařízení a je neměnné" },
    { cislo: "20 s", popis: "od doběhu k veřejným výsledkům — publikace běží automaticky" },
    { cislo: "3 min", popis: "od Excelu s přihláškami ke startovní listině s čísly a kategoriemi" },
  ],
  funkce: {
    eyebrow: "Funkce",
    h2: "Všechno, co závod potřebuje. Nic navíc.",
    karty: [
      {
        titul: "Měření jedním ťuknutím",
        popis: "Číselník startovních čísel nebo velké tlačítko pro rozhodčího. Razítko času je neměnné — opravy mění jen přiřazení, nikdy čas.",
      },
      {
        titul: "Import z Excelu",
        popis: "Nahrajete přihlášky tak, jak vám přišly. Sloupce namapujeme, čísla přidělíme hromadně, kategorie dopočítáme z ročníku.",
      },
      {
        titul: "Funguje offline",
        popis: "Na louce bez signálu se měří dál. Průchody čekají ve frontě v zařízení a odešlou se samy, jakmile jste online.",
      },
      {
        titul: "Listiny na jedno kliknutí",
        popis: "Startovní listina, výsledky po kategoriích i podklad pro vyhlášení — A4 do tisku nebo PDF a XLSX ke stažení.",
      },
    ],
  },
  jak: {
    eyebrow: "Jak to funguje",
    h2: "Tři kroky k výsledkům",
    kroky: [
      {
        cislo: "01",
        titul: "Nahrajte přihlášky",
        popis: "Excel s příjmeními a ročníky stačí. Čísla přidělíme, kategorie dopočítáme.",
      },
      {
        cislo: "02",
        titul: "Odbavte cíl ťukáním",
        popis: "Číselník nebo velké tlačítko. Každé ťuknutí = neměnné razítko času. I offline.",
      },
      {
        cislo: "03",
        titul: "Sdílejte výsledky",
        popis: "Odkaz nebo QR — diváci sledují pořadí živě. Listiny vytisknete na A4.",
      },
    ],
  },
  divaci: {
    eyebrow: "Pro diváky",
    h2: "Rodina u trati vidí víc než cílová kamera",
    popis: "Průběžné pořadí, kategorie i mezičasy — živě na mobilu, bez přihlášení. V cílovém prostoru běží velkoplošná tabule s QR kódem.",
    urlPill: "casomir.cz/jarni-beh-lipova-2026",
  },
  cenik: {
    eyebrow: "Ceník",
    h2: "Platíte, až když závod roste",
    uvod: "Všechny úrovně mají plné měření i živé výsledky. Žádné funkce za příplatek u malých závodů.",
    tarify: [
      {
        nazev: "Zdarma",
        cena: "0 Kč",
        obdobi: "/ závod",
        popis: "Pro místní běhy a školní závody.",
        badge: "",
        polozky: [
          "do 200 startujících",
          "měření, import z Excelu, opravy",
          "živé veřejné výsledky",
          "listiny PDF / XLSX",
        ],
        cta: "Založit závod",
      },
      {
        nazev: "Závod",
        cena: "1 990 Kč",
        obdobi: "/ závod",
        popis: "Pro velké závody s mezičasy.",
        badge: "Nejčastější volba",
        polozky: [
          "do 1 000 startujících",
          "mezičasové brány a splity",
          "velkoplošná tabule + moderátor",
          "podpora v den závodu",
        ],
        cta: "Vybrat Závod",
      },
      {
        nazev: "Sezóna",
        cena: "9 900 Kč",
        obdobi: "/ rok",
        popis: "Pro pořadatele více akcí.",
        badge: "",
        polozky: [
          "neomezeně závodů i zařízení",
          "vaše logo na veřejných stránkách",
          "statistiky napříč ročníky",
          "přednostní podpora",
        ],
        cta: "Domluvit sezónu",
      },
    ],
    poznamka: "Ceny bez DPH. Neziskové a školní závody nad 200 startujících — napište nám, domluvíme se.",
  },
  faq: {
    eyebrow: "Časté dotazy",
    h2: "Na co se pořadatelé ptají",
    popis: "Nenašli jste odpověď? Napište nám — odpovídáme do druhého dne.",
    cta: "Napsat dotaz",
    polozky: [
      {
        otazka: "Co potřebuji k měření?",
        odpoved: "Notebook nebo tablet s prohlížečem. Žádné čipy, brány ani instalace — čas se razítkuje ťuknutím rozhodčího v cíli. Pro větší závody lze přidat mezičasové brány z dalších zařízení.",
      },
      {
        otazka: "Co když v cíli vypadne internet?",
        odpoved: "Nic se neděje. Měření běží dál offline, průchody se ukládají do zařízení a po obnovení připojení se samy odešlou. Ztráta dat nehrozí — razítko času je neměnné.",
      },
      {
        otazka: "Jak dostanu do systému přihlášky?",
        odpoved: "Nahrajete Excel tak, jak vám přišel. Sloupce namapujete ve dvou krocích, startovní čísla přidělíme hromadně a kategorie se dopočítají z ročníku narození.",
      },
      {
        otazka: "Kolik to stojí?",
        odpoved: "Do 200 startujících zdarma, bez omezení funkcí. Nad 200 startujících se domluvíme individuálně — napište nám.",
      },
      {
        otazka: "Uvidí diváci výsledky hned?",
        odpoved: "Ano. Průběžné pořadí se publikuje automaticky každých 20 sekund na veřejnou stránku závodu — stačí sdílet odkaz nebo QR kód. Bez přihlášení.",
      },
      {
        otazka: "Můžu výsledky opravit?",
        odpoved: "Ano, kdykoli. Změna čísla, DNF nebo smazání průchodu se ukládá do historie — původní časové razítko zůstává, mění se jen přiřazení.",
      },
    ],
  },
  ctaFinal: {
    h2: "Příští závod změřte s Časomírem",
    popis: "Založení akce trvá minutu. Zdarma do 200 startujících.",
    cta: "Založit závod zdarma",
  },
  paticka: {
    dokumentace: "Dokumentace",
    kontakt: "Kontakt",
    podminky: "Podmínky",
  },
};

/* ---------- Zod validace (ukládání z administrace) ---------- */

const dukazSchema = z.object({ cislo: z.string(), popis: z.string() });
const funkceSchema = z.object({ titul: z.string(), popis: z.string() });
const krokSchema = z.object({
  cislo: z.string(),
  titul: z.string(),
  popis: z.string(),
});
const tarifSchema = z.object({
  nazev: z.string(),
  cena: z.string(),
  obdobi: z.string(),
  popis: z.string(),
  badge: z.string(),
  polozky: z.array(z.string()),
  cta: z.string(),
});
const faqSchema = z.object({ otazka: z.string(), odpoved: z.string() });

export const landingObsahSchema: z.ZodType<LandingObsah> = z.object({
  kontaktEmail: z.string(),
  nav: z.object({
    funkce: z.string(),
    jak: z.string(),
    cenik: z.string(),
    divaci: z.string(),
    prihlasit: z.string(),
    cta: z.string(),
  }),
  hero: z.object({
    eyebrow: z.string(),
    h1a: z.string(),
    h1b: z.string(),
    sub: z.string(),
    ctaPrimary: z.string(),
    ctaSecondary: z.string(),
    note: z.string(),
    mockEyebrow: z.string(),
    mockTitul: z.string(),
    mockPaticka: z.string(),
  }),
  dukazy: z.array(dukazSchema),
  funkce: z.object({
    eyebrow: z.string(),
    h2: z.string(),
    karty: z.array(funkceSchema),
  }),
  jak: z.object({
    eyebrow: z.string(),
    h2: z.string(),
    kroky: z.array(krokSchema),
  }),
  divaci: z.object({
    eyebrow: z.string(),
    h2: z.string(),
    popis: z.string(),
    urlPill: z.string(),
  }),
  cenik: z.object({
    eyebrow: z.string(),
    h2: z.string(),
    uvod: z.string(),
    tarify: z.array(tarifSchema),
    poznamka: z.string(),
  }),
  faq: z.object({
    eyebrow: z.string(),
    h2: z.string(),
    popis: z.string(),
    cta: z.string(),
    polozky: z.array(faqSchema),
  }),
  ctaFinal: z.object({ h2: z.string(), popis: z.string(), cta: z.string() }),
  paticka: z.object({
    dokumentace: z.string(),
    kontakt: z.string(),
    podminky: z.string(),
  }),
});

/* ---------- Slévání DB (částečné) přes výchozí ---------- */

function jePlainObjekt(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Rekurzivně sloučí `prepis` (z DB, může být neúplný) přes `zaklad` (výchozí).
 * Objekty se slévají po klíčích, pole po indexech (prvek z prepisu se sloučí
 * s prvkem ze základu) — přidání nového pole do modelu tak nerozbije existující
 * uložený obsah, doplní se výchozí hodnota.
 */
function sluc<T>(zaklad: T, prepis: unknown): T {
  if (prepis === undefined || prepis === null) return zaklad;
  if (Array.isArray(zaklad) && Array.isArray(prepis)) {
    const delka = Math.max(zaklad.length, prepis.length);
    const out: unknown[] = [];
    for (let i = 0; i < delka; i++) {
      if (i < prepis.length && i < zaklad.length) out.push(sluc(zaklad[i], prepis[i]));
      else if (i < prepis.length) out.push(prepis[i]);
      else out.push(zaklad[i]);
    }
    return out as unknown as T;
  }
  if (jePlainObjekt(zaklad) && jePlainObjekt(prepis)) {
    const out: Record<string, unknown> = { ...zaklad };
    for (const k of Object.keys(prepis)) {
      out[k] = k in zaklad ? sluc((zaklad as Record<string, unknown>)[k], prepis[k]) : prepis[k];
    }
    return out as unknown as T;
  }
  return prepis as T;
}

/** Sloučí uložený (částečný) obsah přes výchozí → kompletní `LandingObsah`. */
export function slouciObsah(ulozeny: unknown): LandingObsah {
  return sluc(VYCHOZI_OBSAH, ulozeny);
}
