import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  akce as akceT,
  cilovyZaznam,
  upravaLog,
} from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { casNaInput, casDneKratky } from "@/lib/cas";
import {
  vlozitRucniPruchod,
  upravitCasZaznamu,
  upravitCisloZaznamu,
  zmenitStavZaznamu,
} from "@/server/opravy";
import { Btn, Card, PageHeader, Pill } from "../../../_components/ui";
import { SpravaShell } from "@/app/[locale]/admin/_components/sprava-shell";

export const dynamic = "force-dynamic";

const STAV_LABEL: Record<string, string> = {
  platny: "platný",
  neprirazeno: "k doplnění",
  smazany: "smazaný",
  DNF: "DNF",
};

type PillTon = "success" | "warning" | "error" | "info" | "teal" | "ink";

const STAV_TON: Record<string, PillTon> = {
  platny: "teal",
  neprirazeno: "warning",
  DNF: "warning",
  DNS: "warning",
  DSQ: "error",
  smazany: "ink",
};

export default async function OpravyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chyba?: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;
  const sp = await searchParams;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const zaznamy = await db.query.cilovyZaznam.findMany({
    where: eq(cilovyZaznam.akceId, id),
    orderBy: (z, { desc }) => [desc(z.poradiDoteku)],
    with: { zavodnik: true },
  });

  const log = await db.query.upravaLog.findMany({
    where: eq(upravaLog.akceId, id),
    orderBy: [desc(upravaLog.kdy)],
    limit: 40,
  });

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-4xl p-8">
      <PageHeader
        eyebrow="Opravy"
        title="Opravy průchodů"
        desc="Ruční úprava času (oprava překlepu), doplnění čísla, vložení vynechaného průchodu, DNF a mazání. Razítko měň jen při opravě překlepu."
      />

      {sp.chyba && (
        <p className="mb-4 rounded-[10px] bg-error-bg p-3 text-sm text-error">
          {sp.chyba}
        </p>
      )}

      {/* Ruční vložení */}
      <section className="mb-6">
        <div className="cal-eyebrow mb-3">Vložit vynechaný průchod</div>
        <Card className="p-5">
          <form
            action={vlozitRucniPruchod.bind(null, id)}
            className="flex flex-wrap items-end gap-4"
          >
            <input type="hidden" name="datum" value={akce.datum} />
            <label className="cal-label">
              Čas (HH:mm:ss.SSS)
              <input
                name="cas"
                required
                placeholder="14:03:27.480"
                className="cal-input w-44 font-technical tabular-nums"
              />
            </label>
            <label className="cal-label">
              Číslo (volitelně)
              <input
                name="cislo"
                inputMode="numeric"
                className="cal-input w-28 font-technical tabular-nums"
              />
            </label>
            <Btn type="submit">Vložit</Btn>
          </form>
        </Card>
      </section>

      {/* Tabulka průchodů */}
      <section className="mb-8">
        <div className="cal-eyebrow mb-3">Průchody ({zaznamy.length})</div>
        {zaznamy.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-ink-500">Zatím žádné průchody.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-[12px] font-medium uppercase text-ink-500">
                  <th className="px-4 py-2.5 font-medium">#</th>
                  <th className="px-2 py-2.5 font-medium">Čas (editovatelný)</th>
                  <th className="px-2 py-2.5 font-medium">Číslo</th>
                  <th className="px-2 py-2.5 font-medium">Jméno</th>
                  <th className="px-2 py-2.5 font-medium">Stav</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-150">
                {zaznamy.map((z) => {
                  const smazany = z.stav === "smazany";
                  return (
                    <tr
                      key={z.id}
                      className={`hover:bg-ink-50 ${smazany ? "text-ink-400 line-through" : "text-ink-900"}`}
                    >
                      <td className="px-4 py-1.5 font-technical tabular-nums text-ink-400">
                        {z.poradiDoteku}
                      </td>
                      <td className="px-2 py-1.5">
                        <form
                          action={upravitCasZaznamu.bind(null, z.id, id)}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            name="cas"
                            defaultValue={casNaInput(z.casCile)}
                            className="cal-input w-32 px-2 py-1 font-technical tabular-nums"
                          />
                          <button className="text-xs font-medium text-teal-600 hover:text-teal-700">
                            ulož
                          </button>
                        </form>
                      </td>
                      <td className="px-2 py-1.5">
                        <form
                          action={upravitCisloZaznamu.bind(null, z.id, id)}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            name="cislo"
                            defaultValue={z.startovniCislo ?? ""}
                            inputMode="numeric"
                            className="cal-input w-16 px-2 py-1 font-technical tabular-nums"
                          />
                          <button className="text-xs font-medium text-teal-600 hover:text-teal-700">
                            ulož
                          </button>
                        </form>
                      </td>
                      <td className="px-2 py-1.5">
                        {z.zavodnik
                          ? `${z.zavodnik.prijmeni} ${z.zavodnik.jmeno}`
                          : z.startovniCislo === null
                            ? "—"
                            : "neznámé číslo"}
                      </td>
                      <td className="px-2 py-1.5">
                        <Pill
                          ton={STAV_TON[z.stav] ?? "ink"}
                          className={z.stav === "smazany" ? "line-through" : ""}
                        >
                          {STAV_LABEL[z.stav] ?? z.stav}
                        </Pill>
                      </td>
                      <td className="px-4 py-1.5 text-right">
                        <div className="flex justify-end gap-1 text-xs">
                          {z.stav !== "DNF" ? (
                            <StavButton
                              zaznamId={z.id}
                              akceId={id}
                              stav="DNF"
                              label="DNF"
                            />
                          ) : (
                            <StavButton
                              zaznamId={z.id}
                              akceId={id}
                              stav={z.startovniCislo !== null ? "platny" : "neprirazeno"}
                              label="zrušit DNF"
                            />
                          )}
                          {smazany ? (
                            <StavButton
                              zaznamId={z.id}
                              akceId={id}
                              stav={z.startovniCislo !== null ? "platny" : "neprirazeno"}
                              label="obnovit"
                            />
                          ) : (
                            <StavButton
                              zaznamId={z.id}
                              akceId={id}
                              stav="smazany"
                              label="smazat"
                              cervena
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* Historie změn */}
      <section>
        <div className="cal-eyebrow mb-3">Historie změn</div>
        <Card className="p-5">
          {log.length === 0 ? (
            <p className="text-sm text-ink-500">Zatím žádné úpravy.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 font-technical text-[12px] text-ink-500">
              {log.map((l) => (
                <li key={l.id} className="flex gap-3">
                  <span className="shrink-0 tabular-nums text-ink-400">
                    {casDneKratky(l.kdy)}
                  </span>
                  <span>{l.popis}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
      </div>
    </SpravaShell>
  );
}

function StavButton({
  zaznamId,
  akceId,
  stav,
  label,
  cervena,
}: {
  zaznamId: string;
  akceId: string;
  stav: "platny" | "neprirazeno" | "smazany" | "DNF";
  label: string;
  cervena?: boolean;
}) {
  return (
    <form action={zmenitStavZaznamu.bind(null, zaznamId, akceId, stav)}>
      <button
        className={`rounded-md px-2 py-1 font-medium transition-colors ${cervena ? "text-error hover:bg-error-bg" : "text-ink-500 hover:bg-ink-100 hover:text-ink-700"}`}
      >
        {label}
      </button>
    </form>
  );
}
