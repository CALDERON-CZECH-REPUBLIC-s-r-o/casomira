import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  akce as akceT,
  kategorie as katT,
  zavodnik as zavT,
  cilovyZaznam as czT,
  prihlaska as prihT,
} from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { verejnyOdkaz } from "@/lib/verejna-url";
import { qrSvgDataUri } from "@/lib/qr";
import { BtnLink, Card, MetricCard } from "../../_components/ui";
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
  const novePrihlasky = await db.$count(
    prihT,
    and(eq(prihT.akceId, id), eq(prihT.stav, "nova")),
  );

  const profilUrl = verejnyOdkaz(akce.slug);
  const profilQr = await qrSvgDataUri(profilUrl);

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

        {/* Veřejný profil — QR na stránku akce */}
        <Card className="mb-8 flex flex-wrap items-center gap-5 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profilQr}
            alt={`QR na ${profilUrl}`}
            className="h-28 w-28 flex-none rounded-[10px] border border-ink-150 bg-white p-1.5"
          />
          <div className="min-w-0 flex-1">
            <div className="cal-eyebrow text-teal-600">Veřejný profil akce</div>
            <div className="mt-1 font-technical text-sm break-all text-ink-900">
              {profilUrl}
            </div>
            <p className="mt-1.5 text-[13px] text-ink-500">
              Vytiskněte QR na plakát nebo do cíle — diváci naskenují a vidí
              startovku i živé výsledky.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={profilQr}
                download={`qr-${akce.slug}.svg`}
                className="cal-press rounded-[10px] border border-ink-200 bg-white px-3 py-1.5 text-[13px] font-medium text-ink-700 hover:bg-ink-100"
              >
                Stáhnout QR (SVG)
              </a>
              <a
                href={`/${akce.slug}`}
                target="_blank"
                className="cal-press rounded-[10px] px-3 py-1.5 text-[13px] font-medium text-teal-600 hover:bg-teal-50"
              >
                Otevřít profil ↗
              </a>
            </div>
          </div>
        </Card>

        {/* Rychlé akce */}
        <div className="mb-10 flex flex-wrap gap-2">
          <BtnLink href={`/admin/akce/${id}/prihlasky`} variant="ghost">
            Přihlášky{novePrihlasky > 0 ? ` (${novePrihlasky})` : ""}
          </BtnLink>
          <BtnLink href={`/admin/akce/${id}/import`} variant="ghost">
            Importovat závodníky
          </BtnLink>
          <BtnLink href={`/admin/akce/${id}/kategorie`} variant="ghost">
            Kategorie
          </BtnLink>
          <BtnLink href={`/admin/akce/${id}/listiny`} variant="ghost">
            Listiny
          </BtnLink>
          <BtnLink
            href={`/${akce.slug}/tabule`}
            variant="ghost"
            target="_blank"
          >
            Tabule (projekce) ↗
          </BtnLink>
          <BtnLink
            href={`/admin/akce/${id}/moderator`}
            variant="ghost"
            target="_blank"
          >
            Moderátor ↗
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
