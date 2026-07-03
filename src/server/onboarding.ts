"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { uzivatel } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";

/**
 * Dokončí onboarding (11a): nastaví příznak `onboardingHotovo` přihlášenému
 * uživateli a přesměruje do administrace. E-mail bereme ze session (auth()).
 */
export async function dokoncitOnboarding() {
  const session = await vyzadujPrihlaseni();
  const email = session.user?.email;
  if (email) {
    await db
      .update(uzivatel)
      .set({ onboardingHotovo: true })
      .where(eq(uzivatel.email, email));
  }
  redirect("/admin");
}
