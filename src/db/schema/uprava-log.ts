import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { akce } from "./akce";

/**
 * Lehký audit log oprav (SPEC 5.5 — „log úprav, ideálně historie změn").
 * Každá ruční oprava průchodu / změna stavu závodníka sem zapíše čitelný popis.
 * Bez atribuce uživatele (MVP = jeden organizátor).
 */
export const upravaLog = pgTable(
  "uprava_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    akceId: uuid("akce_id")
      .notNull()
      .references(() => akce.id, { onDelete: "cascade" }),
    zaznamId: uuid("zaznam_id"), // bez FK — záznam se „maže" jen měkce (stav)
    popis: text("popis").notNull(),
    kdy: timestamp("kdy", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("uprava_log_akce_idx").on(t.akceId, t.kdy)],
);

export type UpravaLog = typeof upravaLog.$inferSelect;
