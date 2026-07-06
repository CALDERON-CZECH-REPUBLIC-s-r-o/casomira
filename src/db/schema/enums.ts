import { pgEnum } from "drizzle-orm/pg-core";

/** Pohlaví závodníka. Normalizováno na M/Z při importu. */
export const pohlaviEnum = pgEnum("pohlavi", ["M", "Z"]);

/** Pohlaví kategorie — kromě M/Z i smíšená. */
export const pohlaviKategorieEnum = pgEnum("pohlavi_kategorie", [
  "M",
  "Z",
  "smisene",
]);

/** Stav závodníka v rámci akce. */
export const zavodnikStavEnum = pgEnum("zavodnik_stav", [
  "prihlasen",
  "nenastoupil_DNS",
  "diskvalifikovan_DSQ",
]);

/** Stav cílového záznamu (průchodu). */
export const cilovyStavEnum = pgEnum("cilovy_stav", [
  "platny",
  "neprirazeno",
  "smazany",
  "DNF",
]);

/** Stav veřejné přihlášky na akci (rozcestník: nová → schválená / zamítnutá). */
export const prihlaskaStavEnum = pgEnum("prihlaska_stav", [
  "nova",
  "schvalena",
  "zamitnuta",
]);
