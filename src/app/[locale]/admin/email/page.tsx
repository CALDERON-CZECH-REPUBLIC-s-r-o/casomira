import { vyzadujSuperAdmina } from "@/auth/guard";
import { nactiEmailKonfig, ulozitEmailKonfig } from "@/server/email";
import { Btn, Card, BackLink } from "../_components/ui";
import { TestForm } from "./test-form";

export const dynamic = "force-dynamic";

/**
 * Globální nastavení mailera (SMTP, výchozí Office 365). Platí pro celou
 * instanci — odesílá notifikace o registracích a schválení pořadatelů.
 */
export default async function EmailPage() {
  await vyzadujSuperAdmina();
  const k = await nactiEmailKonfig();

  return (
    <main className="min-h-screen bg-ink-50">
      <div className="cal-dots border-b border-ink-200 bg-[rgba(248,250,249,.92)]">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div className="mb-3">
            <BackLink href="/admin">Administrace</BackLink>
          </div>
          <div className="cal-eyebrow mb-1 text-teal-600">Integrace</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            E-mail (SMTP)
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Výchozí nastavení pro Office&nbsp;365 (Microsoft&nbsp;365). Odesílá
            notifikace o nových registracích a schválení pořadatelů. Použij
            e-mail schránky s povoleným SMTP AUTH (často je potřeba app password).
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-3xl space-y-6 px-6 py-6">
        <Card className="p-5">
          <form action={ulozitEmailKonfig} className="flex flex-col gap-5">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="povoleno"
                defaultChecked={k.povoleno}
                className="mt-0.5 h-4 w-4 flex-none accent-teal-500"
              />
              <span className="text-sm">
                <span className="font-medium text-ink-900">
                  Odesílání e-mailů zapnuto
                </span>
                <span className="mt-0.5 block text-ink-500">
                  Vypnuté = notifikace se negenerují (účty jde schvalovat i tak).
                </span>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="cal-label sm:col-span-2">
                SMTP host
                <input
                  name="host"
                  defaultValue={k.host}
                  placeholder="smtp.office365.com"
                  className="cal-input font-technical"
                />
              </label>
              <label className="cal-label">
                Port
                <input
                  name="port"
                  type="number"
                  inputMode="numeric"
                  defaultValue={k.port}
                  placeholder="587"
                  className="cal-input font-technical"
                />
              </label>
            </div>

            <label className="cal-label">
              SMTP uživatel (přihlašovací e-mail)
              <input
                name="uzivatel"
                defaultValue={k.uzivatel}
                autoComplete="off"
                placeholder="noreply@vasedomena.cz"
                className="cal-input font-technical"
              />
            </label>
            <label className="cal-label">
              Heslo (nebo app password)
              <input
                name="heslo"
                type="password"
                defaultValue={k.heslo}
                autoComplete="new-password"
                className="cal-input font-technical"
              />
            </label>
            <label className="cal-label">
              Odesílatel (From)
              <input
                name="odesilatel"
                defaultValue={k.odesilatel}
                placeholder="noreply@vasedomena.cz"
                className="cal-input font-technical"
              />
              <span className="text-xs text-ink-400">
                Musí být adresa, ze které schránka smí odesílat (obvykle stejná
                jako uživatel nebo její alias).
              </span>
            </label>
            <label className="cal-label">
              Adresa pro notifikace o registracích
              <input
                name="adminEmail"
                defaultValue={k.adminEmail}
                placeholder="admin@vasedomena.cz"
                className="cal-input font-technical"
              />
            </label>

            <div>
              <Btn type="submit">Uložit</Btn>
            </div>
          </form>
        </Card>

        <Card className="p-5">
          <div className="cal-eyebrow mb-3 text-teal-600">Test odeslání</div>
          <TestForm />
        </Card>
      </section>
    </main>
  );
}
