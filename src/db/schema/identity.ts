import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { uzivatelRoleEnum, uzivatelStavEnum } from "./enums";

/**
 * Pořadatelský účet. Credentials login (e-mail + heslo, argon2 hash).
 * Veřejná registrace (`/registrace`) zakládá účet ve stavu `ceka` — globální
 * admin ho schválí. Účty přes CLI (`npm run create-admin`) jsou rovnou `schvalen`.
 */
export const uzivatel = pgTable("uzivatel", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  jmeno: text("jmeno"),
  heshHesla: text("hash_hesla").notNull(),
  // Onboarding (11a) dokončen — přeskočí uvítací průvodce.
  onboardingHotovo: boolean("onboarding_hotovo").notNull().default(false),
  // Role a stav schválení (multi-tenant + veřejná registrace).
  role: uzivatelRoleEnum("role").notNull().default("organizator"),
  stav: uzivatelStavEnum("stav").notNull().default("ceka"),
  // Fakturační / kontaktní údaje pořadatele (zákazníka).
  firma: text("firma"),
  ico: text("ico"),
  dic: text("dic"),
  telefon: text("telefon"),
  schvalenoAt: timestamp("schvaleno_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Uzivatel = typeof uzivatel.$inferSelect;
export type NovyUzivatel = typeof uzivatel.$inferInsert;
