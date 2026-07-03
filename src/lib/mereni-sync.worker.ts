/// <reference lib="webworker" />
/**
 * Background sync worker měření. Běží mimo hlavní vlákno a nezávisle na měřicí
 * obrazovce (singleton přežívá client-side navigaci v SPA). Každých 5 s přečte
 * dirty průchody z IndexedDB outboxu a odešle je na `/api/mereni/sync`; po
 * potvrzení je označí jako čisté. Díky tomu měření/sync pokračuje i když
 * operátor odskočí do menu — data jsou v IndexedDB v bezpečí a průběžně tečou.
 */

const DB_NAME = "casomira-outbox";
const STORE = "pruchody";
const VERZE = 1;
const INTERVAL_MS = 5000;

// Lokální zálohy — samostatná IndexedDB (nezasahuje do outboxu). Rolling okno.
const ZAL_DB = "casomira-zalohy";
const ZAL_STORE = "zalohy";
const ZAL_INTERVAL_MS = 30000;
const ZAL_KEEP = 20;

interface OutboxRow {
  clientId: string;
  akceId: string;
  casCile: string;
  startovniCislo: number | null;
  stav: string;
  poradiDoteku: number;
  bodId?: string | null;
  dirty: boolean;
}

const sledovane = new Set<string>();
let timer: ReturnType<typeof setInterval> | null = null;
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

function dirtyProAkci(akceId: string): Promise<OutboxRow[]> {
  return otevri().then(
    (db) =>
      new Promise<OutboxRow[]>((resolve, reject) => {
        const idx = db
          .transaction(STORE, "readonly")
          .objectStore(STORE)
          .index("akceId");
        const r = idx.getAll(IDBKeyRange.only(akceId));
        r.onsuccess = () =>
          resolve((r.result as OutboxRow[]).filter((p) => p.dirty));
        r.onerror = () => reject(r.error);
      }),
  );
}

async function oznacCiste(clientIds: string[]): Promise<void> {
  if (clientIds.length === 0) return;
  const db = await otevri();
  const store = db.transaction(STORE, "readwrite").objectStore(STORE);
  await Promise.all(
    clientIds.map(
      (id) =>
        new Promise<void>((resolve) => {
          const g = store.get(id);
          g.onsuccess = () => {
            const p = g.result as OutboxRow | undefined;
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

async function synchronizuj(akceId: string): Promise<void> {
  let dirty: OutboxRow[];
  try {
    dirty = await dirtyProAkci(akceId);
  } catch {
    return;
  }
  if (dirty.length === 0) return;
  try {
    const res = await fetch("/api/mereni/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        akceId,
        pruchody: dirty.map((p) => ({
          clientId: p.clientId,
          casCile: p.casCile,
          startovniCislo: p.startovniCislo,
          stav: p.stav,
          poradiDoteku: p.poradiDoteku,
          bodId: p.bodId ?? null,
        })),
      }),
    });
    if (!res.ok) return; // offline / neautorizováno → příště
    const potvrzene = (await res.json()) as { clientId: string }[];
    await oznacCiste(potvrzene.map((r) => r.clientId));
    (self as unknown as Worker).postMessage({
      type: "synced",
      akceId,
      clientIds: potvrzene.map((r) => r.clientId),
    });
  } catch {
    /* síťová chyba — zkusí se v dalším tiku */
  }
}

function tik() {
  for (const akceId of sledovane) synchronizuj(akceId);
}

// --- Lokální zálohy (à 30 s) ---
let zalDbPromise: Promise<IDBDatabase> | null = null;
let zalTimer: ReturnType<typeof setInterval> | null = null;

function otevriZal(): Promise<IDBDatabase> {
  if (zalDbPromise) return zalDbPromise;
  zalDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(ZAL_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ZAL_STORE)) {
        const s = db.createObjectStore(ZAL_STORE, { keyPath: "kdy" });
        s.createIndex("akceId", "akceId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return zalDbPromise;
}

async function ulozZalohu(akceId: string, snap: unknown, kdy: number) {
  const db = await otevriZal();
  await new Promise<void>((resolve) => {
    const r = db
      .transaction(ZAL_STORE, "readwrite")
      .objectStore(ZAL_STORE)
      .put({ kdy, akceId, snap });
    r.onsuccess = () => resolve();
    r.onerror = () => resolve();
  });
  // Rolling okno: nech posledních ZAL_KEEP pro tuto akci.
  const db2 = await otevriZal();
  const idx = db2.transaction(ZAL_STORE, "readwrite").objectStore(ZAL_STORE).index("akceId");
  const req = idx.getAllKeys(IDBKeyRange.only(akceId));
  req.onsuccess = () => {
    const keys = (req.result as number[]).sort((a, b) => a - b);
    const nadbytek = keys.slice(0, Math.max(0, keys.length - ZAL_KEEP));
    if (nadbytek.length) {
      const store = db2.transaction(ZAL_STORE, "readwrite").objectStore(ZAL_STORE);
      for (const k of nadbytek) store.delete(k);
    }
  };
}

async function zalohuj(akceId: string) {
  try {
    const res = await fetch(`/api/mereni/snapshot?akceId=${akceId}`);
    if (!res.ok) return;
    const snap = await res.json();
    if (!snap) return;
    const kdy = Date.now();
    await ulozZalohu(akceId, snap, kdy);
    (self as unknown as Worker).postMessage({ type: "zaloha", akceId, kdy });
  } catch {
    /* offline / chyba → příště */
  }
}

function tikZaloha() {
  for (const akceId of sledovane) zalohuj(akceId);
}

self.onmessage = (e: MessageEvent) => {
  const data = e.data as { type?: string; akceId?: string };
  if (data?.type === "watch" && data.akceId) {
    sledovane.add(data.akceId);
    if (timer === null) timer = setInterval(tik, INTERVAL_MS);
    if (zalTimer === null) zalTimer = setInterval(tikZaloha, ZAL_INTERVAL_MS);
    synchronizuj(data.akceId); // hned, ne až za 5 s
    zalohuj(data.akceId); // první záloha hned
  }
};
