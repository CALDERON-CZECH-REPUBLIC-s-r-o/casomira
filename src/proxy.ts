import createMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import { authConfig } from "@/auth/config";
import { routing } from "@/i18n/routing";

/**
 * Next.js 16 „proxy" (dříve middleware). Kombinuje:
 *  1) next-intl locale routing (přesměrování / rewrite dle `[locale]`),
 *  2) ochranu administrace (`authorized` callback v edge-safe authConfig).
 * Běží na Edge runtime → jen edge-safe authConfig (bez Credentials/argon2/DB).
 */
const intlMiddleware = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

export default auth((req) => intlMiddleware(req));

export const config = {
  // Vše kromě API, Next interních cest a souborů s příponou (icon.png…).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
