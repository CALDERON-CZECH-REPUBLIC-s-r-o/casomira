import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { akce } from "./akce";
import { pohlaviKategorieEnum } from "./enums";

/**
 * Kategorie v rámci akce. Zařazení dle pohlaví + rozsahu ročníků narození.
 * cas_startu volitelně přepíše hromadný start akce pro tuto kategorii.
 */
export const kategorie = pgTable(
  "kategorie",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    akceId: uuid("akce_id")
      .notNull()
      .references(() => akce.id, { onDelete: "cascade" }),
    nazev: text("nazev").notNull(),
    pohlavi: pohlaviKategorieEnum("pohlavi").notNull(),
    // Rozsah ročníků narození (včetně). NULL = neomezeno z dané strany.
    rokNarozeniOd: integer("rok_narozeni_od"),
    rokNarozeniDo: integer("rok_narozeni_do"),
    poradi: integer("poradi").notNull().default(0),
    casStartu: timestamp("cas_startu", { withTimezone: true }),
    poznamka: text("poznamka"),
  },
  (t) => [index("kategorie_akce_idx").on(t.akceId)],
);

export type Kategorie = typeof kategorie.$inferSelect;
export type NovaKategorie = typeof kategorie.$inferInsert;
