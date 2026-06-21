import { relations } from "drizzle-orm";
import { akce } from "./akce";
import { kategorie } from "./kategorie";
import { zavodnik } from "./zavodnik";
import { cilovyZaznam } from "./cilovy-zaznam";

/** Relace pro Drizzle relational queries (`db.query … with`). */

export const akceRelations = relations(akce, ({ many }) => ({
  kategorie: many(kategorie),
  zavodnici: many(zavodnik),
  zaznamy: many(cilovyZaznam),
}));

export const kategorieRelations = relations(kategorie, ({ one, many }) => ({
  akce: one(akce, { fields: [kategorie.akceId], references: [akce.id] }),
  zavodnici: many(zavodnik),
}));

export const zavodnikRelations = relations(zavodnik, ({ one, many }) => ({
  akce: one(akce, { fields: [zavodnik.akceId], references: [akce.id] }),
  kategorie: one(kategorie, {
    fields: [zavodnik.kategorieId],
    references: [kategorie.id],
  }),
  zaznamy: many(cilovyZaznam),
}));

export const cilovyZaznamRelations = relations(cilovyZaznam, ({ one }) => ({
  akce: one(akce, { fields: [cilovyZaznam.akceId], references: [akce.id] }),
  zavodnik: one(zavodnik, {
    fields: [cilovyZaznam.zavodnikId],
    references: [zavodnik.id],
  }),
}));
