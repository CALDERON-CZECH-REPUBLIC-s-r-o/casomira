import {
  pgTable,
  uuid,
  text,
  date,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Akce = jeden závod. Hromadný start na úrovni akce (cas_startu),
 * kategorie mohou mít volitelně vlastní start.
 */
export const akce = pgTable("akce", {
  id: uuid("id").primaryKey().defaultRandom(),
  nazev: text("nazev").notNull(),
  datum: date("datum").notNull(),
  misto: text("misto"),
  // Referenční rok pro výpočet věku/zařazení. Default = rok z `datum` (nastaví aplikace).
  rok: integer("rok").notNull(),
  slug: text("slug").notNull().unique(),
  // Hromadný start akce. NULL dokud se nestartuje.
  casStartu: timestamp("cas_startu", { withTimezone: true }),
  poznamka: text("poznamka"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Akce = typeof akce.$inferSelect;
export type NovaAkce = typeof akce.$inferInsert;
