import type { NextRequest } from "next/server";
import { nactiHistoriiZavodnika } from "@/lib/historie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Veřejná historie výsledků jedné osoby (shoda dle jména + roku narození).
 * Historické výsledky jsou publikovaná statistika, proto veřejné. Lazy-fetch
 * z detailu závodníka (nezvětšuje polling živých výsledků).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const prijmeni = (sp.get("p") ?? "").trim();
  const jmeno = (sp.get("j") ?? "").trim();
  const rRaw = sp.get("r");
  const rokNarozeni = rRaw && /^\d{4}$/.test(rRaw) ? parseInt(rRaw, 10) : null;

  if (prijmeni === "") {
    return Response.json([], { headers: { "Cache-Control": "no-store" } });
  }

  const historie = await nactiHistoriiZavodnika({ prijmeni, jmeno, rokNarozeni });
  return Response.json(historie, { headers: { "Cache-Control": "no-store" } });
}
