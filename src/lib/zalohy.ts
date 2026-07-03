/**
 * Čtení lokálních záloh (IndexedDB `casomira-zalohy`) — snapshoty ukládá
 * background worker à 30 s. Slouží k přehledu a stažení/obnově, když se něco
 * pokazí (spadlý notebook, poškozená DB). Data žijí v prohlížeči operátora.
 */

const ZAL_DB = "casomira-zalohy";
const ZAL_STORE = "zalohy";

export interface ZalohaMeta {
  kdy: number; // ms timestamp
}

function otevri(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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
}

/** Seznam záloh akce (nejnovější první). */
export async function nactiZalohy(akceId: string): Promise<ZalohaMeta[]> {
  const db = await otevri();
  return new Promise((resolve, reject) => {
    const idx = db
      .transaction(ZAL_STORE, "readonly")
      .objectStore(ZAL_STORE)
      .index("akceId");
    const r = idx.getAllKeys(IDBKeyRange.only(akceId));
    r.onsuccess = () =>
      resolve(
        (r.result as number[]).sort((a, b) => b - a).map((kdy) => ({ kdy })),
      );
    r.onerror = () => reject(r.error);
  });
}

/** Načte snapshot konkrétní zálohy. */
export async function nactiZalohu(kdy: number): Promise<unknown | null> {
  const db = await otevri();
  return new Promise((resolve) => {
    const r = db
      .transaction(ZAL_STORE, "readonly")
      .objectStore(ZAL_STORE)
      .get(kdy);
    r.onsuccess = () => {
      const row = r.result as { snap?: unknown } | undefined;
      resolve(row?.snap ?? null);
    };
    r.onerror = () => resolve(null);
  });
}

/** Stáhne zálohu jako JSON soubor. */
export async function stahniZalohu(kdy: number): Promise<void> {
  const snap = await nactiZalohu(kdy);
  if (!snap) return;
  const blob = new Blob([JSON.stringify(snap, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zaloha-${new Date(kdy).toISOString().replace(/[:.]/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
