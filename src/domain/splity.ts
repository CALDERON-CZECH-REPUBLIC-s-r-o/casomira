/**
 * Mezičasy (splity) na trati z průchodů měřicími body. Odvozuje se, neukládá:
 * pro každý bod nejdřívější platný průchod → kumulativní čas od startu, čas úseku
 * a tempo (z `vzdalenostM`). Pozice v bodě = pořadí kumulativního času napříč
 * závodníky. Akce bez bodů tuto vrstvu nepoužívá (klasické cílové měření).
 */

export interface MericiBodDomain {
  id: string;
  nazev: string;
  poradi: number;
  vzdalenostM: number | null;
  jeCil: boolean;
}

export interface SplitZaznam {
  bodId: string | null;
  casCile: Date | string;
  stav: "platny" | "neprirazeno" | "smazany" | "DNF";
}

export interface SplitBod {
  bod: MericiBodDomain;
  kumulativMs: number | null; // čas od startu k průchodu bodem
  usekMs: number | null; // čas úseku od předchozího bodu
  tempoSecNaKm: number | null; // tempo úseku (s/km)
  poziceVBode: number | null; // pořadí v bodě napříč závodníky
}

function ms(d: Date | string): number {
  return typeof d === "string" ? new Date(d).getTime() : d.getTime();
}

/** Nejdřívější platný průchod daným bodem (ms), nebo null. */
function casVBode(
  zaznamy: SplitZaznam[],
  bodId: string,
): number | null {
  const casy = zaznamy
    .filter((r) => r.stav === "platny" && r.bodId === bodId)
    .map((r) => ms(r.casCile))
    .sort((a, b) => a - b);
  return casy.length ? casy[0] : null;
}

/**
 * Splity jednoho závodníka (bez pozic — ty doplní `spocitejSplity`).
 * Body se řadí dle `poradi`; úsek/tempo se počítá vůči předchozímu bodu s časem.
 */
export function splityZavodnika(
  zaznamy: SplitZaznam[],
  body: MericiBodDomain[],
  startMs: number | null,
): SplitBod[] {
  const serazene = [...body].sort((a, b) => a.poradi - b.poradi);
  let predKum: number | null = null;
  let predVzd = 0;
  return serazene.map((bod) => {
    const cas = casVBode(zaznamy, bod.id);
    const kum = cas !== null && startMs !== null ? cas - startMs : null;
    let usekMs: number | null = null;
    let tempoSecNaKm: number | null = null;
    if (kum !== null) {
      usekMs = predKum !== null ? kum - predKum : kum;
      const dist = bod.vzdalenostM !== null ? bod.vzdalenostM - predVzd : null;
      if (usekMs !== null && dist && dist > 0) {
        // s/km = (usekMs/1000) / (dist/1000) = usekMs / dist
        tempoSecNaKm = usekMs / dist;
      }
      predKum = kum;
      predVzd = bod.vzdalenostM ?? predVzd;
    }
    return { bod, kumulativMs: kum, usekMs, tempoSecNaKm, poziceVBode: null };
  });
}

/**
 * Splity všech závodníků s doplněnými pozicemi v každém bodě (1 = nejrychlejší
 * kumulativní čas v daném bodě). `startMsProZavodnika` vrací start dle kategorie/akce.
 */
export function spocitejSplity(
  zavodnici: { id: string }[],
  zaznamyDleZavodnika: Map<string, SplitZaznam[]>,
  body: MericiBodDomain[],
  startMsProZavodnika: (zavodnikId: string) => number | null,
): Map<string, SplitBod[]> {
  const vysledek = new Map<string, SplitBod[]>();
  for (const z of zavodnici) {
    vysledek.set(
      z.id,
      splityZavodnika(
        zaznamyDleZavodnika.get(z.id) ?? [],
        body,
        startMsProZavodnika(z.id),
      ),
    );
  }

  // Pozice v každém bodě = pořadí kumulativního času napříč závodníky.
  for (const bod of body) {
    const kandidati = zavodnici
      .map((z) => {
        const split = vysledek.get(z.id)!.find((s) => s.bod.id === bod.id);
        return { id: z.id, kum: split?.kumulativMs ?? null };
      })
      .filter((k): k is { id: string; kum: number } => k.kum !== null)
      .sort((a, b) => a.kum - b.kum);
    kandidati.forEach((k, i) => {
      const split = vysledek.get(k.id)!.find((s) => s.bod.id === bod.id);
      if (split) split.poziceVBode = i + 1;
    });
  }

  return vysledek;
}

/** Formátuje tempo (s/km) na „m:ss/km". */
export function formatTempo(secNaKm: number | null): string {
  if (secNaKm === null || !Number.isFinite(secNaKm)) return "—";
  const s = Math.round(secNaKm);
  const m = Math.floor(s / 60);
  const zb = s % 60;
  return `${m}:${String(zb).padStart(2, "0")}/km`;
}
