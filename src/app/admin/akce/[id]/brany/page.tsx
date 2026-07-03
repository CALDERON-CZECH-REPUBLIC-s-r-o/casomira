import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { MapPin } from "lucide-react";
import { db } from "@/db/client";
import { akce as akceT, mericiBod as bodT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { nastavitCilovyBod, smazatBod } from "@/server/body";
import { Btn, Card, EmptyState, PageHeader, Pill } from "@/app/admin/_components/ui";
import { ConfirmDialog } from "@/app/admin/_components/ui-client";
import { SpravaShell } from "@/app/admin/_components/sprava-shell";
import { BodFormDialog } from "./bod-form";

export const dynamic = "force-dynamic";

const TYP_LABEL: Record<string, string> = {
  startovni: "startovní",
  prubezna: "průběžná",
  cilova: "cílová",
};

export default async function BranyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const body = await db.query.mericiBod.findMany({
    where: eq(bodT.akceId, id),
    orderBy: (b, { asc }) => [asc(b.poradi)],
  });

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-4xl p-8">
        <PageHeader
          eyebrow="Měření"
          title="Měřicí body na trati"
          desc="Brány na trati; jedna je cílová a rozhoduje o výsledku."
          actions={
            <BodFormDialog
              akceId={id}
              trigger={(open) => <Btn onClick={open}>+ Přidat bod</Btn>}
            />
          }
        />

        {body.length === 0 ? (
          <EmptyState
            icon={<MapPin className="h-7 w-7" />}
            title="Zatím žádné měřicí body"
            desc="Bez bodů běží klasické cílové měření — měří se jen průchod cílem. Přidej brány, pokud chceš mezičasy a tempo na trati."
            actions={
              <BodFormDialog
                akceId={id}
                trigger={(open) => <Btn onClick={open}>Přidat bod</Btn>}
              />
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="cal-eyebrow grid grid-cols-[1fr_5rem_9rem_6rem_3.5rem_5rem] items-center gap-3 border-b border-ink-150 px-4 py-3 text-ink-500">
              <span>Bod</span>
              <span>Vzdál.</span>
              <span>Zařízení</span>
              <span>Typ</span>
              <span>Cíl</span>
              <span></span>
            </div>
            <div className="divide-y divide-ink-150">
              {body.map((bod) => (
                <div
                  key={bod.id}
                  className="grid grid-cols-[1fr_5rem_9rem_6rem_3.5rem_5rem] items-center gap-3 px-4 py-3 hover:bg-ink-50"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-ink-900">{bod.nazev}</div>
                    <div className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-400">
                      pořadí {bod.poradi}
                    </div>
                  </div>
                  <div className="font-technical tabular-nums text-ink-700">
                    {bod.vzdalenostM === null ? "— m" : `${bod.vzdalenostM} m`}
                  </div>
                  <div className="min-w-0">
                    {bod.zarizeni ? (
                      <span className="truncate text-sm text-ink-700">
                        {bod.zarizeni}
                      </span>
                    ) : (
                      <Pill ton="ink">nepřiřazeno</Pill>
                    )}
                  </div>
                  <div>
                    <Pill ton={bod.jeCil ? "teal" : "ink"}>
                      {TYP_LABEL[bod.typ] ?? bod.typ}
                    </Pill>
                  </div>
                  <div>
                    <CilRadio bodId={bod.id} akceId={id} jeCil={bod.jeCil} />
                  </div>
                  <div className="flex items-center justify-end gap-3 text-[11px]">
                    <BodFormDialog
                      akceId={id}
                      bod={bod}
                      trigger={(open) => (
                        <button
                          onClick={open}
                          className="text-ink-500 underline hover:text-teal-700"
                        >
                          upravit
                        </button>
                      )}
                    />
                    <ConfirmDialog
                      title="Smazat měřicí bod"
                      message={
                        <>
                          Opravdu smazat bod{" "}
                          <strong className="text-ink-900">{bod.nazev}</strong>?
                        </>
                      }
                      dopady={[
                        "Průchody touto branou zůstanou, jen ztratí navázaný bod.",
                      ]}
                      confirmLabel="Smazat bod"
                      action={smazatBod.bind(null, bod.id, id)}
                      trigger={(open) => (
                        <button
                          onClick={open}
                          className="text-error underline hover:text-error"
                        >
                          smazat
                        </button>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </SpravaShell>
  );
}

/** Radio-like ovládání cílové brány: vyplněné teal kolečko když je cíl. */
function CilRadio({
  bodId,
  akceId,
  jeCil,
}: {
  bodId: string;
  akceId: string;
  jeCil: boolean;
}) {
  return (
    <form action={nastavitCilovyBod.bind(null, bodId, akceId)}>
      <button
        type="submit"
        aria-label={jeCil ? "Cílová brána" : "Nastavit jako cílovou"}
        aria-pressed={jeCil}
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
          jeCil
            ? "border-teal-500 bg-teal-500"
            : "border-ink-250 bg-white hover:border-teal-400"
        }`}
      >
        {jeCil && <span className="h-2 w-2 rounded-full bg-white" />}
      </button>
    </form>
  );
}
