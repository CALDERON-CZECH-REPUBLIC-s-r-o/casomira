import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { uzivatel } from "@/db/schema";
import { authConfig } from "./config";

/**
 * Plný auth (Node runtime). Sdílí edge-safe `authConfig` a přidává Credentials
 * provider, který ověřuje heslo proti DB (argon2). Importovat jen na serveru.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        heslo: { label: "Heslo", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "")
          .trim()
          .toLowerCase();
        const heslo = String(creds?.heslo ?? "");
        if (!email || !heslo) return null;

        const u = await db.query.uzivatel.findFirst({
          where: eq(uzivatel.email, email),
        });
        if (!u) return null;

        const ok = await verify(u.heshHesla, heslo);
        if (!ok) return null;

        return { id: u.id, email: u.email, name: u.jmeno ?? u.email };
      },
    }),
  ],
});
