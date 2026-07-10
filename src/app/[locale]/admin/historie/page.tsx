import { count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  akce as akceT,
  zavodnik as zavT,
  historickyVysledek as histT,
} from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { smazatHistoriiRocnik, spustitMigraciHistorie } from "@/server/historie";
import { BackLink, BtnLink, Card, EmptyState, Pill } from "../_components/ui";
import { ConfirmDialog } from "../_components/ui-client";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Správa historických výsledků (samostatná statistika). Seznam naimportovaných
 * ročníků + náprava dřívějších importů, které omylem skončily ve startovní
 * listině akce (přesun do `historicky_vysledek`).
 */
export default async function HistoriePage() {
  await vyzadujPrihlaseni();

  const rocniky = await db
    .select({
      akceNazev: histT.akceNazev,
      rok: histT.rok,
      pocet: count(),
    })
    .from(histT)
    .groupBy(histT.akceNazev, histT.rok)
    .orderBy(desc(histT.rok), histT.akceNazev);

  // Akce, do kterých se historie omylem naimportovala jako závodníci (náprava).
  const zaneradene = await db
    .select({
      akceId: zavT.akceId,
      nazev: akceT.nazev,
      pocet: count(),
    })
    .from(zavT)
    .innerJoin(akceT, eq(akceT.id, zavT.akceId))
    .where(isNotNull(zavT.cistyCasImportMs))
    .groupBy(zavT.akceId, akceT.nazev)
    .orderBy(sql`count(*) desc`);

  return (
    <main className="min-h-screen bg-ink-50">
      <div className="cal-dots border-b border-ink-200 bg-[rgba(248,250,249,.92)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-end justify-between gap-4 px-6 py-6">
          <div>
            <div className="mb-3">
              <BackLink href="/admin">Administrace</BackLink>
            </div>
            <div className="cal-eyebrow mb-1 text-teal-600">Statistiky</div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
              Historické výsledky
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">
              Samostatná statistika minulých ročníků. Páruje se k závodníkům dle
              jména a roku narození. <strong>Nezasahuje</strong> do startovní
              listiny ani měření živých akcí.
            </p>
          </div>
          <BtnLink href="/admin/historie/import">+ Import z PDF</BtnLink>
        </div>
      </div>

      <section className="mx-auto max-w-3xl space-y-8 px-6 py-6">
        {/* Náprava zaneřáděné startovky */}
        {zaneradene.length > 0 && (
          <div>
            <div className="cal-eyebrow mb-3 text-error">
              Náprava — historie ve startovní listině
            </div>
            <Card className="border-error/30 p-5">
              <p className="mb-4 text-sm text-ink-600">
                Tyto akce mají naimportované historické výsledky mezi závodníky
                (zaneřáďují startovku). Přesuň je do historie — odeberou se ze
                startovní listiny, reálné přihlášky zůstanou.
              </p>
              <div className="divide-y divide-ink-150">
                {zaneradene.map((z) => (
                  <div
                    key={z.akceId}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink-900">
                        {z.nazev}
                      </div>
                      <div className="font-technical text-[12px] tabular-nums text-ink-500">
                        {z.pocet} historických závodníků ve startovce
                      </div>
                    </div>
                    <ConfirmDialog
                      triggerLabel="Přesunout do historie"
                      triggerClassName="flex-none text-sm font-medium text-error transition-colors hover:underline"
                      title="Přesunout historii ze startovky"
                      message={`Přesune ${z.pocet} historických výsledků do statistiky a odebere je ze startovní listiny akce „${z.nazev}". Reálné přihlášky a měření zůstanou.`}
                      slovo="PRESUNOUT"
                      confirmLabel="Přesunout"
                      action={spustitMigraciHistorie.bind(null, z.akceId)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Naimportované ročníky */}
        <div>
          <div className="cal-eyebrow mb-3 text-teal-600">
            Naimportované ročníky
          </div>
          {rocniky.length === 0 ? (
            <EmptyState
              icon={<History size={28} strokeWidth={1.75} />}
              title="Zatím žádná historie"
              desc="Naimportuj výsledkovou listinu minulého ročníku z PDF."
              actions={
                <BtnLink href="/admin/historie/import">Import z PDF</BtnLink>
              }
            />
          ) : (
            <Card className="divide-y divide-ink-150 overflow-hidden">
              {rocniky.map((g) => (
                <div
                  key={`${g.akceNazev}|${g.rok}`}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="truncate font-medium text-ink-900">
                        {g.akceNazev}
                      </span>
                      <Pill ton="ink">{g.rok}</Pill>
                    </div>
                    <div className="mt-0.5 font-technical text-[12px] tabular-nums text-ink-500">
                      {g.pocet} výsledků
                    </div>
                  </div>
                  <ConfirmDialog
                    triggerLabel="Smazat"
                    title="Smazat ročník historie"
                    message={`Smaže všech ${g.pocet} historických výsledků ročníku „${g.akceNazev}" (${g.rok}).`}
                    slovo="SMAZAT"
                    confirmLabel="Smazat"
                    action={smazatHistoriiRocnik.bind(null, g.akceNazev, g.rok)}
                  />
                </div>
              ))}
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}
