"use client";

/**
 * IndexedDB outbox pro měření (defense in depth, SPEC 7.2).
 *
 * Každý průchod se nejdřív zapíše sem (lokálně, okamžitě) a teprve poté se
 * synchronizuje na server. Klíč `clientId` (UUID) zajišťuje idempotentní sync
 * a deduplikaci. Při pádu serveru se nic neztratí — přehraje se z outboxu.
 *
 * Záznam je „dirty", dokud ho server nepotvrdí. Úprava (doplnění čísla, smazání)
 * jen aktualizuje řádek a znovu nastaví dirty → znovu se odešle.
 */

export type PruchodStav = "platny" | "neprirazeno" | "smazany" | "DNF";

export interface OutboxPruchod {
  clientId: string;
  akceId: string;
  casCile: string; // ISO, wall-clock ms
  startovniCislo: number | null;
  stav: PruchodStav;
  poradiDoteku: number;
  bodId?: string | null; // měřicí bod (brána); NULL = klasický cíl
  dirty: boolean; // čeká na potvrzení serverem
}

const DB_NAME = "casomira-outbox";
const STORE = "pruchody";
const VERZE = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function otevri(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERZE);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "clientId" });
        store.createIndex("akceId", "akceId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

/** Vloží/aktualizuje průchod (vždy nastaví na uložený stav). */
export async function ulozPruchod(p: OutboxPruchod): Promise<void> {
  const db = await otevri();
  await new Promise<void>((resolve, reject) => {
    const r = tx(db, "readwrite").put(p);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

/** Všechny průchody akce (pro načtení fronty po reloadu). */
export async function nactiProAkci(akceId: string): Promise<OutboxPruchod[]> {
  const db = await otevri();
  return new Promise((resolve, reject) => {
    const idx = tx(db, "readonly").index("akceId");
    const r = idx.getAll(IDBKeyRange.only(akceId));
    r.onsuccess = () => resolve(r.result as OutboxPruchod[]);
    r.onerror = () => reject(r.error);
  });
}

/** Nesynchronizované (dirty) průchody akce — k odeslání na server. */
export async function nactiDirty(akceId: string): Promise<OutboxPruchod[]> {
  const vse = await nactiProAkci(akceId);
  return vse.filter((p) => p.dirty);
}

/** Smaže všechny lokální průchody akce (vymazání průběhu závodu). */
export async function smazVseProAkci(akceId: string): Promise<void> {
  const db = await otevri();
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, "readwrite");
    const idx = store.index("akceId");
    const req = idx.openCursor(IDBKeyRange.only(akceId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Označí potvrzené průchody jako synchronizované. */
export async function oznacCisté(clientIds: string[]): Promise<void> {
  if (clientIds.length === 0) return;
  const db = await otevri();
  const store = tx(db, "readwrite");
  await Promise.all(
    clientIds.map(
      (id) =>
        new Promise<void>((resolve) => {
          const g = store.get(id);
          g.onsuccess = () => {
            const p = g.result as OutboxPruchod | undefined;
            if (p) {
              p.dirty = false;
              store.put(p);
            }
            resolve();
          };
          g.onerror = () => resolve();
        }),
    ),
  );
}
