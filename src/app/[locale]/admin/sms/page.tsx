import { vyzadujPrihlaseni } from "@/auth/guard";
import { nactiSmsKonfig, ulozitSmsKonfig } from "@/server/sms";
import { Btn, Card, BackLink } from "../_components/ui";

export const dynamic = "force-dynamic";

/**
 * Globální nastavení SMS brány (gosms.eu). Zatím jen konfigurace přístupů —
 * odesílání SMS se dodá při napojení. Platí pro celý účet (ne per akci).
 */
export default async function SmsPage() {
  await vyzadujPrihlaseni();
  const k = await nactiSmsKonfig();

  return (
    <main className="min-h-screen bg-ink-50">
      <div className="cal-dots border-b border-ink-200 bg-[rgba(248,250,249,.92)]">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div className="mb-3">
            <BackLink href="/admin">Administrace</BackLink>
          </div>
          <div className="cal-eyebrow mb-1 text-teal-600">Integrace</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            SMS brána (gosms.eu)
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Přístupy platí pro celý účet. Klíče najdeš v gosms.eu → API (OAuth 2.0
            client credentials). Samotné odesílání SMS závodníkům dodáme při
            napojení.
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-6 py-6">
        <Card className="p-5">
          <form action={ulozitSmsKonfig} className="flex flex-col gap-5">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="povoleno"
                defaultChecked={k.povoleno}
                className="mt-0.5 h-4 w-4 flex-none accent-teal-500"
              />
              <span className="text-sm">
                <span className="font-medium text-ink-900">
                  Odesílání SMS zapnuto
                </span>
                <span className="mt-0.5 block text-ink-500">
                  Zapne SMS funkce, jakmile budou napojené.
                </span>
              </span>
            </label>

            <label className="cal-label">
              Client ID
              <input
                name="clientId"
                defaultValue={k.clientId}
                autoComplete="off"
                className="cal-input font-technical"
              />
            </label>

            <label className="cal-label">
              Client Secret
              <input
                name="clientSecret"
                type="password"
                defaultValue={k.clientSecret}
                autoComplete="new-password"
                className="cal-input font-technical"
              />
            </label>

            <label className="cal-label">
              Kanál / odesílatel
              <input
                name="kanal"
                defaultValue={k.kanal}
                placeholder="ID kanálu v gosms"
                className="cal-input font-technical"
              />
              <span className="text-xs text-ink-400">
                ID kanálu (channel), přes který se SMS odesílají.
              </span>
            </label>

            <div>
              <Btn type="submit">Uložit</Btn>
            </div>
          </form>
        </Card>
      </section>
    </main>
  );
}
