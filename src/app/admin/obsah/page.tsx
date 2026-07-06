import { vyzadujPrihlaseni } from "@/auth/guard";
import { nactiLandingObsah } from "@/server/obsah";
import { BackLink } from "../_components/ui";
import { ObsahForm } from "./obsah-form";

export const dynamic = "force-dynamic";

/**
 * Editace textů veřejné landing page (`/`). Formulář drží celý obsahový model;
 * po uložení se JSON zapíše do `web_obsah` a landing se revaliduje.
 */
export default async function ObsahPage() {
  await vyzadujPrihlaseni();
  const obsah = await nactiLandingObsah();

  return (
    <main className="min-h-screen bg-ink-50">
      <div className="cal-dots border-b border-ink-200 bg-[rgba(248,250,249,.92)]">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div className="mb-3">
            <BackLink href="/admin">Administrace</BackLink>
          </div>
          <div className="cal-eyebrow mb-1 text-teal-600">Obsah webu</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            Texty úvodní stránky
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Upravte texty marketingové landing page. Struktura, ikony a barvy
            zůstávají dle designu — měníte jen znění.
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-6 py-6">
        <ObsahForm vychozi={obsah} />
      </section>
    </main>
  );
}
