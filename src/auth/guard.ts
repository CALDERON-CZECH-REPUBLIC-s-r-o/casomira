import { redirect } from "next/navigation";
import { auth } from "./nextauth";

/**
 * Guard pro server akce a server komponenty administrace. Vrátí session,
 * nebo přesměruje na přihlášení. Proxy chrání /admin na úrovni routingu,
 * tohle chrání i přímé volání server akcí.
 */
export async function vyzadujPrihlaseni() {
  const session = await auth();
  if (!session?.user) redirect("/prihlaseni");
  return session;
}
