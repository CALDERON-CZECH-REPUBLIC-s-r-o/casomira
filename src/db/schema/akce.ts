import {
  pgTable,
  uuid,
  text,
  date,
  integer,
  timestamp,
  boolean,
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
  // --- Nastavení akce (10a) ---
  // Veřejná stránka /{slug} viditelná (false = skrytá / 404).
  verejna: boolean("verejna").notNull().default(true),
  // Auto-publikace na cloud na pozadí.
  autoPublikace: boolean("auto_publikace").notNull().default(false),
  // Přesnost zobrazeného času: 'sekundy' | 'desetiny' | 'setiny'.
  presnostCasu: text("presnost_casu").notNull().default("desetiny"),
  // Délka trati v metrech (pro tempo/mezičasy). NULL = neuvedeno.
  delkaM: integer("delka_m"),
  // Historická akce — výsledky naimportované z PDF, ne měřené živě.
  historicka: boolean("historicka").notNull().default(false),
  // --- Veřejné přihlášky + platby ---
  // Přihlašování z veřejné stránky /{slug} zapnuté.
  registraceOtevrena: boolean("registrace_otevrena").notNull().default(false),
  // Přihláška musí být schválena organizátorem, než jde do startovní listiny.
  registraceSchvalovani: boolean("registrace_schvalovani")
    .notNull()
    .default(true),
  // Bankovní účet pro QR platbu startovného: `19-2000145399/0800`, `2000145399/0800` nebo IBAN.
  ucet: text("ucet"),
  // Startovné v celých Kč (NULL = neuvedeno / zdarma).
  startovne: integer("startovne"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Akce = typeof akce.$inferSelect;
export type NovaAkce = typeof akce.$inferInsert;
