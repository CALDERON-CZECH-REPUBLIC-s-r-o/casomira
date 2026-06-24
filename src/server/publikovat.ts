"use server";

import { env } from "@/lib/env";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { sestavSnapshot, ulozSnapshot, snapshotSchema } from "@/lib/snapshot";

export interface VysledekPublikovani {
  ok: boolean;
  chyba?: string;
  kdy?: string;
  zaznamu?: number;
}

/**
 * Jednosměrný push akce na cloud (SPEC 7.5). Best-effort — selže-li (offline),
 * měření tím není dotčeno. Idempotentní (cloud full-replace dle id/client_id).
 */
export async function publikovat(akceId: string): Promise<VysledekPublikovani> {
  await vyzadujPrihlaseni();
  if (!env.CLOUD_SYNC_URL || !env.SYNC_TOKEN) {
    return {
      ok: false,
      chyba: "Cloud sync není nakonfigurován (CLOUD_SYNC_URL + SYNC_TOKEN).",
    };
  }
  const snap = await sestavSnapshot(akceId);
  if (!snap) return { ok: false, chyba: "Akce nenalezena." };

  try {
    const r = await fetch(`${env.CLOUD_SYNC_URL}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-token": env.SYNC_TOKEN,
      },
      body: JSON.stringify(snap),
      cache: "no-store",
    });
    if (!r.ok) {
      return { ok: false, chyba: `Cloud odpověděl ${r.status}.` };
    }
    return {
      ok: true,
      kdy: new Date().toISOString(),
      zaznamu: snap.zaznamy.length,
    };
  } catch {
    return { ok: false, chyba: "Spojení s cloudem selhalo (offline?)." };
  }
}

/** Obnova akce ze zálohy (JSON snapshot) — nahraje do lokální DB. */
export async function obnovitZeZalohy(
  _akceId: string,
  formData: FormData,
): Promise<VysledekPublikovani> {
  await vyzadujPrihlaseni();
  const file = formData.get("zaloha");
  if (!(file instanceof File)) return { ok: false, chyba: "Chybí soubor." };
  let body: unknown;
  try {
    body = JSON.parse(await file.text());
  } catch {
    return { ok: false, chyba: "Soubor není platné JSON." };
  }
  const parsed = snapshotSchema.safeParse(body);
  if (!parsed.success) return { ok: false, chyba: "Neplatný formát zálohy." };
  await ulozSnapshot(parsed.data);
  return { ok: true, zaznamu: parsed.data.zaznamy.length };
}
