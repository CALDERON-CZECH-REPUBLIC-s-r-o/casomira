import { env } from "@/lib/env";
import { snapshotSchema, ulozSnapshot } from "@/lib/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cloud ingest: přijme snapshot akce z lokální instance (jednosměrný push, SPEC 7.5).
 * Autorizace sdíleným tokenem (SYNC_TOKEN). Idempotentní — full replace akce.
 */
export async function POST(req: Request) {
  if (!env.SYNC_TOKEN) {
    return Response.json(
      { chyba: "Sync není na této instanci nakonfigurován (SYNC_TOKEN)." },
      { status: 503 },
    );
  }
  if (req.headers.get("x-sync-token") !== env.SYNC_TOKEN) {
    return Response.json({ chyba: "Neautorizováno" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ chyba: "Neplatné JSON" }, { status: 400 });
  }

  const parsed = snapshotSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { chyba: "Neplatný snapshot", detail: parsed.error.issues.slice(0, 3) },
      { status: 400 },
    );
  }

  await ulozSnapshot(parsed.data);
  return Response.json({
    ok: true,
    slug: parsed.data.akce.slug,
    zaznamu: parsed.data.zaznamy.length,
  });
}
