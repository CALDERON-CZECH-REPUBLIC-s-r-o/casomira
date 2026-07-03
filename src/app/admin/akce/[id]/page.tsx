import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  akce as akceT,
  kategorie as katT,
  zavodnik as zavT,
  cilovyZaznam as czT,
} from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { BtnLink, MetricCard } from "../../_components/ui";
import { SpravaShell } from "../../_components/sprava-shell";

export const dynamic = "force-dynamic";

function formatStart(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AkceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const kategorie = await db.$count(katT, eq(katT.akceId, id));
  const zavodnici = await db.$count(zavT, eq(zavT.akceId, id));
  const bezKategorie = await db.$count(
    zavT,
    and(eq(zavT.akceId, id), isNull(zavT.kategorieId)),
  );
  const vCili = await db.$count(
    czT,
    and(eq(czT.akceId, id), eq(czT.stav, "platny")),
  );

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-4xl p-8">
        {/* Hlavička akce */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="cal-eyebrow mb-1 text-teal-600">Akce</div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">
              {akce.nazev}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
              <span className="font-technical tabular-nums">{akce.datum}</span>
              {akce.misto && <span>· {akce.misto}</span>}
              <span>·</span>
              <a
                href={`/${akce.slug}`}
                target="_blank"
                className="font-medium text-teal-600 hover:text-teal-700"
              >
                /{akce.slug} ↗
              </a>
            </div>
          </div>
          <BtnLink href={`/admin/akce/${id}/mereni`} className="flex-none">
            ▶ Spustit měření
          </BtnLink>
        </div>

        {/* Metriky */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Kategorie" value={kategorie} />
          <MetricCard
            label="Závodníci"
            value={zavodnici}
            sub={bezKategorie ? `${bezKategorie} bez kategorie` : "vše zařazeno"}
          />
          <MetricCard label="V cíli" value={vCili} sub="platných průchodů" />
          <MetricCard
            label="Start"
            value={formatStart(akce.casStartu)}
            sub={akce.casStartu ? "hromadný start" : "zatím nespuštěno"}
            zvyraznit
          />
        </div>

        {/* Rychlé akce */}
        <div className="mb-10 flex flex-wrap gap-2">
          <BtnLink href={`/admin/akce/${id}/import`} variant="ghost">
            Importovat závodníky
          </BtnLink>
          <BtnLink href={`/admin/akce/${id}/kategorie`} variant="ghost">
            Kategorie
          </BtnLink>
          <BtnLink href={`/admin/akce/${id}/listiny`} variant="ghost">
            Listiny
          </BtnLink>
          <BtnLink href={`/admin/akce/${id}/publikovat`} variant="ghost">
            Publikovat
          </BtnLink>
          <BtnLink href={`/admin/akce/${id}/nastaveni`} variant="ghost">
            Nastavení
          </BtnLink>
        </div>
      </div>
    </SpravaShell>
  );
}
