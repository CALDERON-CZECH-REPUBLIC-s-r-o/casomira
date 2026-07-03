import { NextResponse, type NextRequest } from "next/server";
import { ulozitPruchody } from "@/server/mereni";

/**
 * Sync endpoint pro background worker měření. Worker sem posílá dirty průchody
 * z IndexedDB outboxu (i když operátor odejde z měřicí obrazovky). Auth přes
 * cookie session (worker fetch je same-origin). Idempotentní dle client_id.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json([], { status: 400 });
  }
  const { akceId, pruchody } =
    (body as { akceId?: string; pruchody?: unknown }) ?? {};
  if (!akceId) return NextResponse.json([], { status: 400 });

  try {
    const vysledky = await ulozitPruchody(akceId, pruchody);
    return NextResponse.json(vysledky);
  } catch {
    // Nepřihlášeno / redirect z guardu → worker to zkusí příště.
    return NextResponse.json([], { status: 401 });
  }
}
