export type Pohlavi = "M" | "Z";

const MUZ = new Set([
  "m",
  "muz",
  "muž",
  "muzi",
  "muži",
  "male",
  "man",
  "chlapec",
  "h",
]);
const ZENA = new Set([
  "z",
  " z",
  "ž",
  "zena",
  "žena",
  "zeny",
  "ženy",
  "female",
  "woman",
  "divka",
  "dívka",
  "f",
  "w",
]);

/**
 * Normalizuje hodnotu pohlaví z Excelu na M/Z. Akceptuje běžné varianty.
 * Vrací null, pokud chybí nebo je nejednoznačná (→ k doplnění v aplikaci).
 */
export function normalizujPohlavi(raw: unknown): Pohlavi | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "") return null;
  if (MUZ.has(s)) return "M";
  if (ZENA.has(s)) return "Z";
  return null;
}

/** Sjednotí na lowercase bez diakritiky pro porovnání ve slovníku jmen. */
function bezDiakritiky(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Nejběžnější česká křestní jména (bez diakritiky). Slouží k odhadu pohlaví,
// když ho přihlášky neobsahují. Doplňuje pravidlo přechylování příjmení níže.
const ZENSKA_JMENA = new Set(
  (
    "anna eva marie hana jana lenka katerina katerina lucie alena vera vera jarmila " +
    "ivana zuzana petra veronika jitka martina michaela ludmila jaroslava tereza " +
    "eliska barbora nikola tereza monika simona kristyna adela natalie karolina " +
    "denisa aneta gabriela pavla renata dagmar helena olga marketa marcela " +
    "dana daniela sona sarah sara viktorie ema emma julie laura klara vendula " +
    "romana radka bozena vlasta zdenka blanka irena libuse miloslava anezka " +
    "stepanka tanja tana bara magdalena magda nela amalie rozalie stela izabela " +
    "valerie johana antonie mia elena diana patricie sabina iveta"
  ).split(/\s+/),
);
const MUZSKA_JMENA = new Set(
  (
    "jan jiri petr josef pavel martin tomas jaroslav miroslav zdenek frantisek " +
    "vaclav michal milan david jakub jan ladislav lukas ondrej marek antonin " +
    "roman vladimir karel radek jan filip jan stanislav rostislav vojtech matej " +
    "adam daniel dominik patrik richard robert rudolf oldrich bohumil emil ivan " +
    "libor lubomir ludek luboš otakar premysl vit vitezslav dalibor kamil kryštof " +
    "kristian maxmilian samuel sebastian simon stepan tobias vaclav viktor " +
    "alois arnost bedrich cyril hynek jaromir metodej norbert oto rene svatopluk " +
    "teodor timotej vlastimil zbynek"
  ).split(/\s+/),
);

/** První token jména (křestní jméno bez druhého jména). */
function krestni(jmeno: string): string {
  return bezDiakritiky(jmeno.trim().split(/\s+/)[0] ?? "");
}

/**
 * Heuristický odhad pohlaví z českého příjmení (-ová / -á → žena).
 * Ostatní příjmení bereme jako mužská (nepřechýlená base forma). Vrací null
 * jen u prázdného vstupu. Heuristika je editovatelná v aplikaci.
 */
export function odhadniPohlaviZPrijmeni(prijmeni: string): Pohlavi | null {
  const p = prijmeni.trim().toLowerCase();
  if (p === "") return null;
  return p.endsWith("á") ? "Z" : "M";
}

/**
 * Odhad pohlaví z celého jména. Nejdřív křestní jméno (slovník běžných českých
 * jmen — spolehlivé i u cizích/nepřechýlených příjmení), pak přechylování
 * příjmení (-ová/-á → žena, jinak muž). Vrací null u prázdného vstupu.
 */
export function odhadniPohlaviZeJmena(
  jmeno: string,
  prijmeni: string,
): Pohlavi | null {
  const j = krestni(jmeno);
  if (j !== "") {
    if (ZENSKA_JMENA.has(j)) return "Z";
    if (MUZSKA_JMENA.has(j)) return "M";
  }
  return odhadniPohlaviZPrijmeni(prijmeni);
}
