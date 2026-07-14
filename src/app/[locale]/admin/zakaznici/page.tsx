import { eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { db } from "@/db/client";
import { uzivatel as uzivatelT, akce as akceT } from "@/db/schema";
import { vyzadujSuperAdmina } from "@/auth/guard";
import {
  schvalitOrganizatora,
  zamitnoutOrganizatora,
} from "@/server/organizatori";
import {
  nactiFakturaceKonfig,
  oznacitUhrazenoOrganizatora,
  ulozitFakturaceKonfig,
} from "@/server/fakturace";
import { Btn, Card, BackLink } from "../_components/ui";
import { ConfirmDialog } from "../_components/ui-client";

export const dynamic = "force-dynamic";

/** Panel globálního admina — schvalování pořadatelů, přehled zákazníků, fakturace. */
export default async function ZakazniciPage() {
  await vyzadujSuperAdmina();
  const konfig = await nactiFakturaceKonfig();

  const organizatori = await db.query.uzivatel.findMany({
    where: eq(uzivatelT.role, "organizator"),
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
  const vsechnyAkce = await db
    .select({
      uzivatelId: akceT.uzivatelId,
      uhrazeno: akceT.fakturaceUhrazeno,
    })
    .from(akceT);

  // Agregace akcí po pořadateli.
  const staty = new Map<string, { pocet: number; neuhrazeno: number }>();
  for (const a of vsechnyAkce) {
    if (!a.uzivatelId) continue;
    const s = staty.get(a.uzivatelId) ?? { pocet: 0, neuhrazeno: 0 };
    s.pocet += 1;
    if (!a.uhrazeno) s.neuhrazeno += 1;
    staty.set(a.uzivatelId, s);
  }

  const cekajici = organizatori.filter((o) => o.stav === "ceka");
  const schvaleni = organizatori.filter((o) => o.stav === "schvalen");
  const zamitnuti = organizatori.filter((o) => o.stav === "zamitnut");

  return (
    <main className="min-h-screen bg-ink-50">
      <div className="cal-dots border-b border-ink-200 bg-[rgba(248,250,249,.92)]">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="mb-3">
            <BackLink href="/admin">Administrace</BackLink>
          </div>
          <div className="cal-eyebrow mb-1 text-teal-600">Globální admin</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            Zákazníci a fakturace
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Schvalování pořadatelů, přehled akcí a podklady k platbě.
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-4xl space-y-8 px-6 py-6">
        {/* Ke schválení */}
        {cekajici.length > 0 && (
          <div>
            <div className="cal-eyebrow mb-3 text-amber-600">
              Ke schválení ({cekajici.length})
            </div>
            <Card className="divide-y divide-ink-150 overflow-hidden">
              {cekajici.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-ink-900">
                      {o.firma || o.jmeno || o.email}
                    </div>
                    <div className="font-technical text-[12px] text-ink-500">
                      {o.email}
                      {o.ico ? ` · IČO ${o.ico}` : ""}
                      {o.telefon ? ` · ${o.telefon}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <form action={schvalitOrganizatora.bind(null, o.id)}>
                      <Btn type="submit">Schválit</Btn>
                    </form>
                    <ConfirmDialog
                      triggerLabel="Zamítnout"
                      title="Zamítnout pořadatele?"
                      message={`Účet „${o.email}" se nedostane do administrace.`}
                      slovo="ZAMITNOUT"
                      confirmLabel="Zamítnout"
                      action={zamitnoutOrganizatora.bind(null, o.id)}
                    />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* Zákazníci */}
        <div>
          <div className="cal-eyebrow mb-3 text-teal-600">
            Zákazníci ({schvaleni.length})
          </div>
          {schvaleni.length === 0 ? (
            <p className="text-sm text-ink-400">Zatím žádní schválení pořadatelé.</p>
          ) : (
            <Card className="divide-y divide-ink-150 overflow-hidden">
              {schvaleni.map((o) => {
                const s = staty.get(o.id) ?? { pocet: 0, neuhrazeno: 0 };
                const castka = s.neuhrazeno * konfig.cenaZaAkci;
                return (
                  <div
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/zakaznici/${o.id}`}
                        className="font-medium text-ink-900 hover:text-teal-700"
                      >
                        {o.firma || o.jmeno || o.email}
                      </Link>
                      <div className="font-technical text-[12px] text-ink-500">
                        {o.email}
                        {o.ico ? ` · IČO ${o.ico}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-4">
                      <div className="text-right">
                        <div className="font-technical text-sm tabular-nums text-ink-900">
                          {s.pocet} akcí
                        </div>
                        <div className="font-technical text-[12px] tabular-nums text-ink-500">
                          {s.neuhrazeno > 0
                            ? `${s.neuhrazeno} neuhrazeno · ${castka} Kč`
                            : "vše uhrazeno"}
                        </div>
                      </div>
                      {s.neuhrazeno > 0 && (
                        <ConfirmDialog
                          triggerLabel="Označit uhrazeno"
                          triggerClassName="flex-none text-sm font-medium text-teal-600 transition-colors hover:underline"
                          title="Označit jako uhrazené"
                          message={`Označí ${s.neuhrazeno} akcí pořadatele „${o.firma || o.email}" (${castka} Kč) jako uhrazené.`}
                          slovo="UHRAZENO"
                          confirmLabel="Označit uhrazeno"
                          action={oznacitUhrazenoOrganizatora.bind(null, o.id)}
                        />
                      )}
                      <Link
                        href={`/admin/zakaznici/${o.id}`}
                        className="flex-none text-[13px] font-medium text-ink-500 hover:text-ink-800"
                      >
                        Detail →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        {zamitnuti.length > 0 && (
          <div>
            <div className="cal-eyebrow mb-3 text-ink-400">
              Zamítnutí ({zamitnuti.length})
            </div>
            <Card className="divide-y divide-ink-150 overflow-hidden">
              {zamitnuti.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm text-ink-500"
                >
                  <span>
                    {o.firma || o.jmeno || o.email}{" "}
                    <span className="font-technical text-[12px]">
                      {o.email}
                    </span>
                  </span>
                  <form action={schvalitOrganizatora.bind(null, o.id)}>
                    <button className="text-[13px] font-medium text-teal-600 hover:underline">
                      Přesto schválit
                    </button>
                  </form>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* Nastavení fakturace */}
        <div>
          <div className="cal-eyebrow mb-3 text-teal-600">Nastavení fakturace</div>
          <Card className="p-5">
            <form action={ulozitFakturaceKonfig} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="cal-label">
                  Cena za akci (Kč)
                  <input
                    name="cenaZaAkci"
                    type="number"
                    inputMode="numeric"
                    defaultValue={konfig.cenaZaAkci}
                    className="cal-input font-technical"
                  />
                </label>
                <label className="cal-label sm:col-span-2">
                  Účet platformy (pro QR)
                  <input
                    name="ucet"
                    defaultValue={konfig.ucet}
                    placeholder="19-2000145399/0800 nebo IBAN"
                    className="cal-input font-technical"
                  />
                </label>
              </div>
              <label className="cal-label">
                Název (popis platby)
                <input
                  name="firma"
                  defaultValue={konfig.firma}
                  placeholder="Časomír"
                  className="cal-input"
                />
              </label>
              <div>
                <Btn type="submit">Uložit</Btn>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </main>
  );
}
