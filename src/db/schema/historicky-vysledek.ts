import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { pohlaviEnum } from "./enums";

/**
 * Historický výsledek — samostatná statistika minulých ročníků, NEZÁVISLÁ na
 * `zavodnik`/`akce`. Plní se importem PDF listin (`/admin/historie/import`).
 * Nesmí zasahovat do startovní listiny ani měření živé akce. Ke konkrétnímu
 * závodníkovi se páruje přes jméno + příjmení + rok narození (viz lib/historie.ts).
 */
export const historickyVysledek = pgTable(
  "historicky_vysledek",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prijmeni: text("prijmeni").notNull(),
    jmeno: text("jmeno").notNull(),
    rokNarozeni: integer("rok_narozeni"),
    pohlavi: pohlaviEnum("pohlavi"),
    // Ročník závodu (rok konání dané edice) a její název.
    rok: integer("rok").notNull(),
    akceNazev: text("akce_nazev").notNull(),
    kategorie: text("kategorie"),
    oddil: text("oddil"),
    poradi: integer("poradi"),
    // Čistý čas v milisekundách.
    casMs: integer("cas_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("historicky_osoba_idx").on(t.prijmeni, t.jmeno, t.rokNarozeni),
    index("historicky_rok_idx").on(t.rok),
  ],
);

export type HistorickyVysledek = typeof historickyVysledek.$inferSelect;
export type NovyHistorickyVysledek = typeof historickyVysledek.$inferInsert;
