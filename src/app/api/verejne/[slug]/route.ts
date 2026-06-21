import { nactiVerejnaData } from "@/lib/verejna-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Veřejný JSON s aktuálními výsledky + startovkou (polling z webu akce). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const data = await nactiVerejnaData(slug);
  if (!data) {
    return new Response(JSON.stringify({ chyba: "Akce nenalezena" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
