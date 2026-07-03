/**
 * Detekce konfliktů / duplicit průchodů (6c). Když měří víc zařízení offline
 * (nebo dojde k dvojkliku), může jeden fyzický průchod vzniknout víckrát. Signál:
 * jeden závodník má 2+ PLATNÝCH průchodů týmž měřicím bodem. Operátor pak vybere,
 * který ponechat, ostatní smaže. Časové razítko zůstává neměnné.
 */

export interface KonfliktZaznam {
  id: string;
  zavodnikId: string | null;
  bodId: string | null;
  casCile: Date | string;
  stav: string;
  clientId: string;
  startovniCislo: number | null;
}

export interface KonfliktSkupina {
  zavodnikId: string;
  bodId: string | null;
  zaznamy: KonfliktZaznam[]; // 2+, seřazené vzestupně dle času
  rozptylMs: number; // rozdíl nejpozdějšího a nejdřívějšího času
}

function ms(d: Date | string): number {
  return typeof d === "string" ? new Date(d).getTime() : d.getTime();
}

/**
 * Vrátí skupiny konfliktních průchodů: stejný závodník + stejný bod, 2+ platných.
 * Řadí skupiny sestupně dle počtu záznamů, pak dle rozptylu (těsné = podezřelejší).
 */
export function najdiKonflikty(zaznamy: KonfliktZaznam[]): KonfliktSkupina[] {
  const dle = new Map<string, KonfliktZaznam[]>();
  for (const z of zaznamy) {
    if (z.stav !== "platny" || z.zavodnikId === null) continue;
    const klic = `${z.zavodnikId}::${z.bodId ?? "cil"}`;
    const arr = dle.get(klic) ?? [];
    arr.push(z);
    dle.set(klic, arr);
  }

  const skupiny: KonfliktSkupina[] = [];
  for (const arr of dle.values()) {
    if (arr.length < 2) continue;
    const serazene = [...arr].sort((a, b) => ms(a.casCile) - ms(b.casCile));
    const rozptylMs =
      ms(serazene[serazene.length - 1].casCile) - ms(serazene[0].casCile);
    skupiny.push({
      zavodnikId: serazene[0].zavodnikId!,
      bodId: serazene[0].bodId ?? null,
      zaznamy: serazene,
      rozptylMs,
    });
  }

  return skupiny.sort(
    (a, b) => b.zaznamy.length - a.zaznamy.length || a.rozptylMs - b.rozptylMs,
  );
}
