import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { nactiDataAkce } from "@/lib/listiny-data";
import { serazeneVysledky } from "@/domain/vysledky";
import { cistyCas, ztrata } from "@/lib/cas";
import { SpravaShell } from "@/app/admin/_components/sprava-shell";
import {
  BackLink,
  Card,
  MetricCard,
  MedalCircle,
} from "@/app/admin/_components/ui";

export const dynamic = "force-dynamic";

const STAV_LABEL: Record<string, string> = {
  DNF: "DNF",
  DNS: "DNS",
  DSQ: "DSQ",
  bez_casu: "—",
};

export default async function KategorieZebricekPage({
  params,
}: {
  params: Promise<{ id: string; kod: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id, kod } = await params;
  const kodDekod = decodeURIComponent(kod);

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const data = await nactiDataAkce(id);
  if (!data) notFound();

  const vysledky = serazeneVysledky(
    data.zavodnici,
    data.zaznamy,
    data.akce.casStartu,
    data.kategorie,
  );

  const skupina =
    vysledky.kategorie.find((s) => s.kategorie?.kod === kodDekod) ??
    vysledky.kategorie.find((s) => s.kategorie?.nazev === kodDekod);
  if (!skupina || !skupina.kategorie) notFound();

  const kat = skupina.kategorie;

  // Absolutní pořadí každého závodníka z celkové skupiny.
  const absolutni = new Map<string, number>();
  for (const r of vysledky.celkova.radky) {
    if (r.poradi !== null) absolutni.set(r.zavodnik.id, r.poradi);
  }

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-4xl p-8">
        <div className="mb-3">
          <BackLink href={`/admin/akce/${id}/kategorie`}>Kategorie</BackLink>
        </div>

        <header className="mb-8">
          <div className="cal-eyebrow mb-1 text-teal-600">
            {kat.kod ?? "—"}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">
            {kat.nazev}
          </h1>
        </header>

        <div className="mb-8 grid grid-cols-3 gap-4">
          <MetricCard label="V kategorii" value={skupina.radky.length} />
          <MetricCard label="V cíli" value={skupina.klasifikovano} />
          <MetricCard
            label="DNS / DSQ"
            value={skupina.dns + skupina.dsq}
            sub={skupina.dnf ? `${skupina.dnf} DNF` : undefined}
          />
        </div>

        <Card className="overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_7rem_6rem_5rem] items-center gap-4 border-b border-ink-200 px-5 py-3 font-technical text-[11px] uppercase tracking-[.08em] text-ink-400">
            <span>Poř.</span>
            <span>Závodník</span>
            <span className="text-right">Čistý čas</span>
            <span className="text-right">Ztráta</span>
            <span className="text-right">Absolutně</span>
          </div>
          <div className="divide-y divide-ink-150">
            {skupina.radky.map((r) => {
              const z = r.zavodnik;
              const nedobehl = r.stav !== "klasifikovan";
              const abs = absolutni.get(z.id);
              return (
                <div
                  key={z.id}
                  className={`grid grid-cols-[3rem_1fr_7rem_6rem_5rem] items-center gap-4 px-5 py-3 ${
                    nedobehl ? "text-ink-400" : ""
                  }`}
                >
                  <div>
                    <MedalCircle poradi={r.poradi} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`truncate font-medium ${
                        nedobehl ? "text-ink-400" : "text-ink-900"
                      }`}
                    >
                      {z.prijmeni} {z.jmeno}
                    </div>
                    <div className="font-technical text-[12px] tabular-nums text-ink-400">
                      č.{z.startovniCislo ?? "—"} · {z.rokNarozeni ?? "—"}
                    </div>
                  </div>
                  <div
                    className={`text-right font-technical font-semibold tabular-nums ${
                      nedobehl ? "text-ink-400" : "text-ink-900"
                    }`}
                  >
                    {r.stav === "klasifikovan" && r.cistyCasMs !== null
                      ? cistyCas(r.cistyCasMs)
                      : STAV_LABEL[r.stav] ?? "—"}
                  </div>
                  <div className="text-right font-technical tabular-nums text-ink-400">
                    {r.stav === "klasifikovan" ? ztrata(r.ztrataMs) : ""}
                  </div>
                  <div className="text-right font-technical tabular-nums text-ink-500">
                    {abs ?? "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </SpravaShell>
  );
}
