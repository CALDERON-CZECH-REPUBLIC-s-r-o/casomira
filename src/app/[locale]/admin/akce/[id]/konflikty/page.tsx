import { eq } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/db/client";
import {
  cilovyZaznam,
  mericiBod,
  zavodnik as zavT,
} from "@/db/schema";
import { vyzadujAkci } from "@/auth/guard";
import { casDneKratky } from "@/lib/cas";
import { najdiKonflikty } from "@/domain/konflikty";
import { zmenitStavZaznamu } from "@/server/opravy";
import { Card, EmptyState, PageHeader, Pill } from "../../../_components/ui";
import { SpravaShell } from "../../../_components/sprava-shell";

export const dynamic = "force-dynamic";

export default async function KonfliktyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { akce } = await vyzadujAkci(id);

  const [zaznamy, zavodnici, body] = await Promise.all([
    db.query.cilovyZaznam.findMany({
      where: eq(cilovyZaznam.akceId, id),
      columns: {
        id: true,
        zavodnikId: true,
        bodId: true,
        casCile: true,
        stav: true,
        clientId: true,
        startovniCislo: true,
      },
    }),
    db.query.zavodnik.findMany({
      where: eq(zavT.akceId, id),
      columns: { id: true, jmeno: true, prijmeni: true, startovniCislo: true },
    }),
    db.query.mericiBod.findMany({
      where: eq(mericiBod.akceId, id),
      columns: { id: true, nazev: true },
    }),
  ]);

  const zavMap = new Map(zavodnici.map((z) => [z.id, z]));
  const bodMap = new Map(body.map((b) => [b.id, b.nazev]));
  const skupiny = najdiKonflikty(zaznamy);

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-3xl p-8">
        <PageHeader
          eyebrow="Měření"
          title="Konflikty a duplicity"
          desc="Závodníci s víc platnými průchody týmž bodem — ponech jeden, ostatní smaž."
        />

        {skupiny.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={28} strokeWidth={1.75} />}
            title="Žádné konflikty"
            desc="Každý závodník má nejvýš jeden platný průchod každým měřicím bodem."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {skupiny.map((s) => {
              const zav = zavMap.get(s.zavodnikId);
              const bodNazev = s.bodId ? bodMap.get(s.bodId) ?? "?" : "Cíl";
              return (
                <Card key={`${s.zavodnikId}-${s.bodId}`} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-semibold text-ink-900">
                        {zav ? `${zav.prijmeni} ${zav.jmeno}` : "neznámý"}
                      </span>
                      <span className="ml-2 font-technical text-[12px] text-ink-500">
                        č. {zav?.startovniCislo ?? "—"} · {bodNazev}
                      </span>
                    </div>
                    <Pill ton="warning">{s.zaznamy.length}× průchod</Pill>
                  </div>
                  <div className="divide-y divide-ink-150">
                    {s.zaznamy.map((z, i) => (
                      <div
                        key={z.id}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <span className="font-technical text-[15px] font-semibold tabular-nums text-ink-900">
                          {casDneKratky(z.casCile)}
                        </span>
                        {i === 0 && <Pill ton="teal">nejdřívější</Pill>}
                        <span className="ml-auto font-technical text-[11px] text-ink-400">
                          {z.clientId.slice(0, 8)}
                        </span>
                        <form
                          action={zmenitStavZaznamu.bind(
                            null,
                            z.id,
                            id,
                            "smazany",
                          )}
                        >
                          <button className="rounded-[8px] px-2.5 py-1 text-[13px] font-medium text-error transition-colors hover:bg-error-bg">
                            Smazat
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SpravaShell>
  );
}
