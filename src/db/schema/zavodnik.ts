import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { akce } from "./akce";
import { kategorie } from "./kategorie";
import { pohlaviEnum, zavodnikStavEnum } from "./enums";

/**
 * Závodník přihlášený na akci. Pohlaví může chybět (nejednoznačný import) → NULL,
 * pak se nezařadí do M/Ž kategorie a označí se k doplnění.
 * Kategorie se přiřazuje automaticky, lze přepsat ručně.
 */
export const zavodnik = pgTable(
  "zavodnik",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    akceId: uuid("akce_id")
      .notNull()
      .references(() => akce.id, { onDelete: "cascade" }),
    jmeno: text("jmeno").notNull(),
    prijmeni: text("prijmeni").notNull(),
    rokNarozeni: integer("rok_narozeni"),
    pohlavi: pohlaviEnum("pohlavi"),
    startovniCislo: integer("startovni_cislo"),
    oddil: text("oddil"),
    kategorieId: uuid("kategorie_id").references(() => kategorie.id, {
      onDelete: "set null",
    }),
    stav: zavodnikStavEnum("stav").notNull().default("prihlasen"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Startovní číslo unikátní v rámci akce (NULL povoleno vícenásobně).
    unique("zavodnik_akce_cislo_uq").on(t.akceId, t.startovniCislo),
    index("zavodnik_akce_idx").on(t.akceId),
    index("zavodnik_kategorie_idx").on(t.kategorieId),
  ],
);

export type Zavodnik = typeof zavodnik.$inferSelect;
export type NovyZavodnik = typeof zavodnik.$inferInsert;
