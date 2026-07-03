import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * Organizátorský účet. MVP: jednoduchý credentials login (e-mail + heslo).
 * Heslo se ukládá jako argon2 hash. Účty se zakládají skriptem `npm run create-admin`.
 */
export const uzivatel = pgTable("uzivatel", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  jmeno: text("jmeno"),
  heshHesla: text("hash_hesla").notNull(),
  // Onboarding (11a) dokončen — přeskočí uvítací průvodce.
  onboardingHotovo: boolean("onboarding_hotovo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Uzivatel = typeof uzivatel.$inferSelect;
export type NovyUzivatel = typeof uzivatel.$inferInsert;
