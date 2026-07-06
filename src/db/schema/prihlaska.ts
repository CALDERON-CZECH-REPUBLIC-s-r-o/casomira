import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { akce } from "./akce";
import { zavodnik } from "./zavodnik";
import { pohlaviEnum, prihlaskaStavEnum } from "./enums";

/**
 * Veřejná přihláška na akci (z rozcestníku /{slug}). Držena odděleně od
 * `zavodnik`, protože telefon/e-mail jsou neveřejné PII a přihláška může čekat
 * na schválení / úhradu. Po schválení se založí `zavodnik` a propojí přes
 * `zavodnikId`.
 */
export const prihlaska = pgTable(
  "prihlaska",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    akceId: uuid("akce_id")
      .notNull()
      .references(() => akce.id, { onDelete: "cascade" }),
    jmeno: text("jmeno").notNull(),
    prijmeni: text("prijmeni").notNull(),
    rokNarozeni: integer("rok_narozeni"),
    oddil: text("oddil"),
    telefon: text("telefon"),
    email: text("email"),
    // Odhad pohlaví ze jména (pro zařazení do kategorie při schválení).
    pohlavi: pohlaviEnum("pohlavi"),
    stav: prihlaskaStavEnum("stav").notNull().default("nova"),
    zaplaceno: boolean("zaplaceno").notNull().default(false),
    // Variabilní symbol platby — číselný, přidělený při vzniku (per-akce pořadový).
    variabilniSymbol: text("variabilni_symbol").notNull(),
    // Propojení na založeného závodníka po schválení (NULL = ještě ne).
    zavodnikId: uuid("zavodnik_id").references(() => zavodnik.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("prihlaska_akce_idx").on(t.akceId)],
);

export type Prihlaska = typeof prihlaska.$inferSelect;
export type NovaPrihlaska = typeof prihlaska.$inferInsert;
