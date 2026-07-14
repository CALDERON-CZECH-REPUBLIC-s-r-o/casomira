import type { DefaultSession } from "next-auth";

type UzivatelRole = "organizator" | "superadmin";
type UzivatelStav = "ceka" | "schvalen" | "zamitnut";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UzivatelRole;
      stav: UzivatelStav;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UzivatelRole;
    stav?: UzivatelStav;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UzivatelRole;
    stav?: UzivatelStav;
  }
}
