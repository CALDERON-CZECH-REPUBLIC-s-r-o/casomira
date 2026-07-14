import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe základ auth konfigurace. NEOBSAHUJE Credentials provider ani
 * žádný nativní/DB modul (argon2, postgres) — middleware běží na Edge runtime
 * a takové importy by spadly. Plný config s providerem žije v `nextauth.ts`.
 *
 * `authorized` callback zajišťuje ochranu /admin přímo v middleware.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/prihlaseni",
  },
  providers: [],
  callbacks: {
    authorized({ request, auth }) {
      // Cesta může nést locale prefix (/en/admin…) — před testem ho odřízni.
      const path = request.nextUrl.pathname.replace(/^\/(cs|en)(?=\/|$)/, "");
      const isAdmin = path.startsWith("/admin");
      if (isAdmin) return !!auth?.user;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.stav = user.stav;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role =
          (token.role as "organizator" | "superadmin" | undefined) ??
          "organizator";
        session.user.stav =
          (token.stav as "ceka" | "schvalen" | "zamitnut" | undefined) ??
          "ceka";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
