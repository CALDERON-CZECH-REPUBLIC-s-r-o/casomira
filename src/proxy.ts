import NextAuth from "next-auth";
import { authConfig } from "@/auth/config";

/**
 * Ochrana administrace (Next.js 16 „proxy" konvence, dříve middleware).
 * Běží na Edge runtime → používá pouze edge-safe `authConfig` (bez Credentials/argon2/DB).
 * Přístup k /admin řeší `authorized` callback v configu.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/admin/:path*"],
};
