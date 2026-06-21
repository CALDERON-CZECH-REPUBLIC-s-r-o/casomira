import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { akce } from "./akce";
import { zavodnik } from "./zavodnik";
import { cilovyStavEnum } from "./enums";

/**
 * Cílový záznam = jeden průchod cílem. Časové razítko (cas_cile) se ukládá
 * v okamžiku kliknutí (ms přesnost, wall-clock) a je NEMĚNNÉ i po doplnění čísla.
 *
 * client_id (UUID generovaný na zařízení operátora) zajišťuje idempotentní
 * synchronizaci a deduplikaci napříč outboxem / sync na cloud.
 *
 * Výsledky se z těchto záznamů ODVOZUJÍ dotazem, neukládají se natvrdo.
 */
export const cilovyZaznam = pgTable(
  "cilovy_zaznam",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Idempotentní klíč ze zařízení operátora (outbox / sync).
    clientId: uuid("client_id").notNull().unique(),
    akceId: uuid("akce_id")
      .notNull()
      .references(() => akce.id, { onDelete: "cascade" }),
    // timestamp(3) → milisekundová přesnost; wall-clock z notebooku operátora.
    casCile: timestamp("cas_cile", {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    startovniCislo: integer("startovni_cislo"),
    zavodnikId: uuid("zavodnik_id").references(() => zavodnik.id, {
      onDelete: "set null",
    }),
    stav: cilovyStavEnum("stav").notNull().default("neprirazeno"),
    // Pořadí kliknutí (monotónní v rámci akce) — stabilní řazení při shodném čase.
    poradiDoteku: integer("poradi_doteku"),
    poznamka: text("poznamka"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (t) => [
    index("cilovy_akce_cas_idx").on(t.akceId, t.casCile),
    index("cilovy_zavodnik_idx").on(t.zavodnikId),
  ],
);

export type CilovyZaznam = typeof cilovyZaznam.$inferSelect;
export type NovyCilovyZaznam = typeof cilovyZaznam.$inferInsert;
