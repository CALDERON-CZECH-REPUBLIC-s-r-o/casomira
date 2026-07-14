import { redirect } from "next/navigation";
import { signOut } from "@/auth/nextauth";
import { nactiUzivatele } from "@/auth/guard";
import { Btn, Card, PoweredBy } from "../_components/ui";

export const dynamic = "force-dynamic";

/**
 * Obrazovka pro neschválené účty. Schválený uživatel se sem nedostane
 * (přesměruje se do administrace).
 */
export default async function CekaPage() {
  const { uzivatel } = await nactiUzivatele();
  if (uzivatel.stav === "schvalen") redirect("/admin");

  const zamitnut = uzivatel.stav === "zamitnut";

  return (
    <main className="cal-dots flex min-h-screen flex-col items-center justify-center bg-ink-50 p-6">
      <div className="w-full max-w-md">
        <Card className="p-8 text-center">
          <div className="mb-3 text-4xl">{zamitnut ? "⛔" : "⏳"}</div>
          <h1 className="mb-2 font-display text-xl font-bold text-ink-900">
            {zamitnut ? "Účet byl zamítnut" : "Účet čeká na schválení"}
          </h1>
          <p className="text-sm text-ink-500">
            {zamitnut
              ? "Váš pořadatelský účet nebyl schválen. Ozvěte se prosím administrátorovi."
              : "Děkujeme za registraci. Jakmile administrátor účet schválí, budete moci zakládat a měřit závody."}
          </p>
          <p className="mt-4 font-technical text-[12px] text-ink-400">
            {uzivatel.email}
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/prihlaseni" });
            }}
            className="mt-6"
          >
            <Btn type="submit" variant="ghost">
              Odhlásit se
            </Btn>
          </form>
        </Card>
        <div className="mt-6 flex justify-center">
          <PoweredBy />
        </div>
      </div>
    </main>
  );
}
