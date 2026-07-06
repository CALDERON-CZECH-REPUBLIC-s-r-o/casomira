import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * Editovatelný obsah webu (texty). Klíč-hodnota: jeden řádek = jedna stránka.
 * `klic` = 'landing' drží texty marketingové landing page (`/`) jako JSON dle
 * `LandingObsah` (viz src/lib/landing-obsah.ts). Edituje se z `/admin/obsah`.
 */
export const webObsah = pgTable("web_obsah", {
  klic: text("klic").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WebObsah = typeof webObsah.$inferSelect;
