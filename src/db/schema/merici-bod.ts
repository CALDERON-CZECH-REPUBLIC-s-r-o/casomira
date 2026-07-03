import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { akce } from "./akce";

/**
 * Měřicí bod (brána) na trati — startovní / průběžná / cílová. Průchod
 * (`cilovy_zaznam.bod_id`) se váže k bodu; mezičasy a tempo se z toho odvozují.
 * `jeCil` značí bod, jehož průchod rozhoduje o výsledku. Akce bez bodů =
 * klasické cílové měření (průchody mají `bod_id = NULL`).
 */
export const mericiBod = pgTable(
  "merici_bod",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    akceId: uuid("akce_id")
      .notNull()
      .references(() => akce.id, { onDelete: "cascade" }),
    nazev: text("nazev").notNull(),
    poradi: integer("poradi").notNull().default(0),
    // Vzdálenost od startu v metrech (pro tempo). NULL = neuvedeno.
    vzdalenostM: integer("vzdalenost_m"),
    // 'startovni' | 'prubezna' | 'cilova'
    typ: text("typ").notNull().default("prubezna"),
    // Rozhoduje o výsledku (právě jeden bod na akci).
    jeCil: boolean("je_cil").notNull().default(false),
    // Přiřazené zařízení (název), pro párování offline. NULL = nepřiřazeno.
    zarizeni: text("zarizeni"),
  },
  (t) => [index("merici_bod_akce_idx").on(t.akceId, t.poradi)],
);

export type MericiBod = typeof mericiBod.$inferSelect;
export type NovyMericiBod = typeof mericiBod.$inferInsert;
