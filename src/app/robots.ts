import type { MetadataRoute } from "next";
import { verejnyPuvod } from "@/lib/verejna-url";

// Origin z runtime env (APP_BASE_URL) → negeneruj staticky při buildu.
export const dynamic = "force-dynamic";

/**
 * `/robots.txt` — povolí veřejné stránky, zakáže administraci a API, odkáže na
 * sitemapu. Origin z `APP_BASE_URL` / cloud adresy / produkční domény.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = verejnyPuvod();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
