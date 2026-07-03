import { NextResponse, type NextRequest } from "next/server";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { sestavSnapshot } from "@/lib/snapshot";

/**
 * Vrátí kompletní JSON snapshot akce pro lokální zálohu (background worker si ho
 * tahá à 30 s a ukládá do IndexedDB). Autorizace přes cookie session.
 */
export async function GET(req: NextRequest) {
  try {
    await vyzadujPrihlaseni();
  } catch {
    return NextResponse.json(null, { status: 401 });
  }
  const akceId = req.nextUrl.searchParams.get("akceId");
  if (!akceId) return NextResponse.json(null, { status: 400 });

  const snap = await sestavSnapshot(akceId);
  if (!snap) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(snap);
}
