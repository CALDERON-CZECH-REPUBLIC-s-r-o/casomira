import { auth } from "@/auth/nextauth";
import { smiNaAkci } from "@/auth/guard";
import { sestavSnapshot } from "@/lib/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stáhne zálohu akce jako JSON snapshot (pro jistotu před/po závodě). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Neautorizováno", { status: 401 });

  const { id } = await params;
  if (!(await smiNaAkci(session.user.id, id)))
    return new Response("Nenalezeno", { status: 404 });
  const snap = await sestavSnapshot(id);
  if (!snap) return new Response("Akce nenalezena", { status: 404 });

  return new Response(JSON.stringify(snap, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${snap.akce.slug}-zaloha.json"`,
      "Cache-Control": "no-store",
    },
  });
}
