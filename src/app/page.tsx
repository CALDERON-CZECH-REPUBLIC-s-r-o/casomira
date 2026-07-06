import { db } from "@/db/client";
import { nactiLandingObsah } from "@/server/obsah";
import { Landing, type LandingAkce } from "./_landing/landing";

// Texty i seznam závodů se mění za běhu → vždy čerstvé, žádný statický prerender.
export const dynamic = "force-dynamic";

/**
 * Veřejná úvodní (marketingová) landing page Časomír dle Calderon designu.
 * Texty jsou editovatelné z administrace (/admin/obsah); seznam „živých závodů"
 * se plní z reálných akcí v DB.
 */
export default async function HomePage() {
  const [obsah, akce] = await Promise.all([
    nactiLandingObsah(),
    db.query.akce.findMany({
      where: (a, { eq }) => eq(a.verejna, true),
      orderBy: (a, { desc }) => [desc(a.datum)],
      limit: 8,
    }),
  ]);

  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const zavody: LandingAkce[] = akce.map((a) => {
    const start = a.casStartu ? new Date(a.casStartu).getTime() : null;
    const bezi =
      start !== null && start <= nowMs && nowMs - start < 12 * 3600 * 1000;
    return { nazev: a.nazev, datum: a.datum, misto: a.misto, slug: a.slug, bezi };
  });

  return <Landing obsah={obsah} akce={zavody} />;
}
