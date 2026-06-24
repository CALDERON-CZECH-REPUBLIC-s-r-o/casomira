import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  akce as akceT,
  kategorie as katT,
  zavodnik as zavT,
  cilovyZaznam,
} from "@/db/schema";

/**
 * Snapshot celé akce = autoritativní stav lokální instance.
 * Slouží k jednosměrnému pushi na cloud (SPEC 7.5) i k záloze/obnově (JSON).
 * Idempotentní aplikace: akce se upsertne, děti se kompletně nahradí (full replace),
 * takže cloud je přesná read-only kopie a mazání se propíše.
 */

const isoNull = z.string().datetime({ offset: true }).nullable();

export const snapshotSchema = z.object({
  verze: z.literal(1),
  akce: z.object({
    id: z.string().uuid(),
    nazev: z.string(),
    datum: z.string(),
    misto: z.string().nullable(),
    rok: z.number().int(),
    slug: z.string(),
    casStartu: isoNull,
    poznamka: z.string().nullable(),
  }),
  kategorie: z.array(
    z.object({
      id: z.string().uuid(),
      nazev: z.string(),
      kod: z.string().nullable(),
      pohlavi: z.enum(["M", "Z", "smisene"]),
      rokNarozeniOd: z.number().int().nullable(),
      rokNarozeniDo: z.number().int().nullable(),
      vekOd: z.number().int().nullable(),
      vekDo: z.number().int().nullable(),
      poradi: z.number().int(),
      casStartu: isoNull,
      poznamka: z.string().nullable(),
    }),
  ),
  zavodnici: z.array(
    z.object({
      id: z.string().uuid(),
      jmeno: z.string(),
      prijmeni: z.string(),
      rokNarozeni: z.number().int().nullable(),
      pohlavi: z.enum(["M", "Z"]).nullable(),
      startovniCislo: z.number().int().nullable(),
      oddil: z.string().nullable(),
      mesto: z.string().nullable(),
      kategorieId: z.string().uuid().nullable(),
      stav: z.enum(["prihlasen", "nenastoupil_DNS", "diskvalifikovan_DSQ"]),
    }),
  ),
  zaznamy: z.array(
    z.object({
      id: z.string().uuid(),
      clientId: z.string().uuid(),
      casCile: z.string().datetime({ offset: true }),
      startovniCislo: z.number().int().nullable(),
      zavodnikId: z.string().uuid().nullable(),
      stav: z.enum(["platny", "neprirazeno", "smazany", "DNF"]),
      poradiDoteku: z.number().int().nullable(),
      poznamka: z.string().nullable(),
    }),
  ),
});

export type Snapshot = z.infer<typeof snapshotSchema>;

/** Sestaví snapshot akce dle id (null = neexistuje). */
export async function sestavSnapshot(akceId: string): Promise<Snapshot | null> {
  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, akceId) });
  if (!akce) return null;

  const [kategorie, zavodnici, zaznamy] = await Promise.all([
    db.query.kategorie.findMany({ where: eq(katT.akceId, akceId) }),
    db.query.zavodnik.findMany({ where: eq(zavT.akceId, akceId) }),
    db.query.cilovyZaznam.findMany({ where: eq(cilovyZaznam.akceId, akceId) }),
  ]);

  return {
    verze: 1,
    akce: {
      id: akce.id,
      nazev: akce.nazev,
      datum: akce.datum,
      misto: akce.misto,
      rok: akce.rok,
      slug: akce.slug,
      casStartu: akce.casStartu ? akce.casStartu.toISOString() : null,
      poznamka: akce.poznamka,
    },
    kategorie: kategorie.map((k) => ({
      id: k.id,
      nazev: k.nazev,
      kod: k.kod,
      pohlavi: k.pohlavi,
      rokNarozeniOd: k.rokNarozeniOd,
      rokNarozeniDo: k.rokNarozeniDo,
      vekOd: k.vekOd,
      vekDo: k.vekDo,
      poradi: k.poradi,
      casStartu: k.casStartu ? k.casStartu.toISOString() : null,
      poznamka: k.poznamka,
    })),
    zavodnici: zavodnici.map((z) => ({
      id: z.id,
      jmeno: z.jmeno,
      prijmeni: z.prijmeni,
      rokNarozeni: z.rokNarozeni,
      pohlavi: z.pohlavi,
      startovniCislo: z.startovniCislo,
      oddil: z.oddil,
      mesto: z.mesto,
      kategorieId: z.kategorieId,
      stav: z.stav,
    })),
    zaznamy: zaznamy.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      casCile: r.casCile.toISOString(),
      startovniCislo: r.startovniCislo,
      zavodnikId: r.zavodnikId,
      stav: r.stav,
      poradiDoteku: r.poradiDoteku,
      poznamka: r.poznamka,
    })),
  };
}

/**
 * Idempotentně aplikuje snapshot do lokální DB (cloud ingest i obnova ze zálohy).
 * Transakce: upsert akce, full-replace dětí (děti smaž a vlož znovu).
 */
export async function ulozSnapshot(snap: Snapshot): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(akceT)
      .values({
        id: snap.akce.id,
        nazev: snap.akce.nazev,
        datum: snap.akce.datum,
        misto: snap.akce.misto,
        rok: snap.akce.rok,
        slug: snap.akce.slug,
        casStartu: snap.akce.casStartu ? new Date(snap.akce.casStartu) : null,
        poznamka: snap.akce.poznamka,
      })
      .onConflictDoUpdate({
        target: akceT.id,
        set: {
          nazev: snap.akce.nazev,
          datum: snap.akce.datum,
          misto: snap.akce.misto,
          rok: snap.akce.rok,
          slug: snap.akce.slug,
          casStartu: snap.akce.casStartu ? new Date(snap.akce.casStartu) : null,
          poznamka: snap.akce.poznamka,
        },
      });

    // Full replace dětí (pořadí kvůli FK: nejdřív záznamy, pak závodníci, pak kategorie).
    await tx.delete(cilovyZaznam).where(eq(cilovyZaznam.akceId, snap.akce.id));
    await tx.delete(zavT).where(eq(zavT.akceId, snap.akce.id));
    await tx.delete(katT).where(eq(katT.akceId, snap.akce.id));

    if (snap.kategorie.length > 0) {
      await tx.insert(katT).values(
        snap.kategorie.map((k) => ({
          id: k.id,
          akceId: snap.akce.id,
          nazev: k.nazev,
          kod: k.kod,
          pohlavi: k.pohlavi,
          rokNarozeniOd: k.rokNarozeniOd,
          rokNarozeniDo: k.rokNarozeniDo,
          vekOd: k.vekOd,
          vekDo: k.vekDo,
          poradi: k.poradi,
          casStartu: k.casStartu ? new Date(k.casStartu) : null,
          poznamka: k.poznamka,
        })),
      );
    }
    if (snap.zavodnici.length > 0) {
      await tx.insert(zavT).values(
        snap.zavodnici.map((z) => ({
          id: z.id,
          akceId: snap.akce.id,
          jmeno: z.jmeno,
          prijmeni: z.prijmeni,
          rokNarozeni: z.rokNarozeni,
          pohlavi: z.pohlavi,
          startovniCislo: z.startovniCislo,
          oddil: z.oddil,
          mesto: z.mesto,
          kategorieId: z.kategorieId,
          stav: z.stav,
        })),
      );
    }
    if (snap.zaznamy.length > 0) {
      await tx.insert(cilovyZaznam).values(
        snap.zaznamy.map((r) => ({
          id: r.id,
          clientId: r.clientId,
          akceId: snap.akce.id,
          casCile: new Date(r.casCile),
          startovniCislo: r.startovniCislo,
          zavodnikId: r.zavodnikId,
          stav: r.stav,
          poradiDoteku: r.poradiDoteku,
          poznamka: r.poznamka,
        })),
      );
    }
  });
}
