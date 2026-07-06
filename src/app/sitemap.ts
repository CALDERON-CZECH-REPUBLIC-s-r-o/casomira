import type { MetadataRoute } from "next";
import { db } from "@/db/client";
import { verejnyPuvod } from "@/lib/verejna-url";

// Seznam akcí se mění → vždy čerstvá sitemapa (drží se aktuální „on publish").
export const dynamic = "force-dynamic";

/**
 * `/sitemap.xml` — kanonické veřejné URL: landing + veřejné stránky akcí, obojí
 * v CS (bez prefixu) i EN (`/en`), s hreflang alternativami. Admin a API se
 * nevypisují (jsou zakázané v robots).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = verejnyPuvod();
  const alt = (path: string) => ({
    languages: {
      cs: `${origin}${path}`,
      en: `${origin}/en${path}`,
    },
  });

  const polozky: MetadataRoute.Sitemap = [
    {
      url: origin,
      changeFrequency: "weekly",
      priority: 1,
      alternates: alt(""),
    },
  ];

  try {
    const akce = await db.query.akce.findMany({
      where: (a, { eq }) => eq(a.verejna, true),
      columns: { slug: true, createdAt: true },
    });
    for (const a of akce) {
      polozky.push({
        url: `${origin}/${a.slug}`,
        lastModified: a.createdAt,
        changeFrequency: "hourly",
        priority: 0.8,
        alternates: alt(`/${a.slug}`),
      });
    }
  } catch {
    // DB nedostupná → aspoň landing.
  }

  return polozky;
}
