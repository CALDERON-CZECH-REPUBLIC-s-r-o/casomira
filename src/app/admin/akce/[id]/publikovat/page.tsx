import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT } from "@/db/schema";
import { env } from "@/lib/env";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { qrSvgDataUri } from "@/lib/qr";
import { BtnLink, Card, PageHeader } from "../../../_components/ui";
import { SpravaShell } from "@/app/admin/_components/sprava-shell";
import { PublishPanel, ObnovaForm } from "./publish-panel";
import { LokalniZalohy } from "./lokalni-zalohy";

export const dynamic = "force-dynamic";

export default async function PublikovatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;
  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const nakonfigurovano = !!(env.CLOUD_SYNC_URL && env.SYNC_TOKEN);
  const cloudUrl = env.CLOUD_SYNC_URL
    ? `${env.CLOUD_SYNC_URL.replace(/\/$/, "")}/${akce.slug}`
    : null;
  const qrDataUri = cloudUrl ? await qrSvgDataUri(cloudUrl) : "";

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-4xl p-8">
      <PageHeader
        eyebrow="Publikování"
        title="Publikování a zálohy"
        desc="Jednosměrný push výsledků na cloud pro vzdálené diváky. Měření běží lokálně — publikování je best-effort, výpadek sítě měření neovlivní."
      />

      {/* Publikování */}
      <Card className="mb-6 p-5">
        <div className="cal-eyebrow mb-3 text-teal-600">Cloud</div>
        {nakonfigurovano ? (
          <>
            <p className="mb-4 text-sm text-ink-600">
              Veřejná adresa:{" "}
              <a
                href={cloudUrl!}
                target="_blank"
                className="font-medium text-teal-600 hover:text-teal-700"
              >
                {cloudUrl} ↗
              </a>
            </p>
            <PublishPanel
              akceId={id}
              nakonfigurovano={nakonfigurovano}
              slug={akce.slug}
              qrDataUri={qrDataUri}
            />
          </>
        ) : (
          <p className="rounded-[10px] bg-warning-bg p-3 text-sm text-warning">
            Cloud sync není nakonfigurován. Nastav <code className="font-technical">CLOUD_SYNC_URL</code> (na
            lokální instanci) a stejný <code className="font-technical">SYNC_TOKEN</code> na obou instancích.
            Bez toho publikování nefunguje — veřejný web ale jede i lokálně na
            <code className="font-technical"> /{akce.slug}</code>.
          </p>
        )}
      </Card>

      {/* Projekce — velkoplošná tabule */}
      <Card className="mb-6 p-5">
        <div className="cal-eyebrow mb-3 text-teal-600">
          Projekce — velkoplošná tabule
        </div>
        <p className="mb-4 text-sm text-ink-600">
          Tmavá tabule pro projektor / LED stěnu s živými výsledky (aktualizace à
          5 s). Otevři na plátně a přepni prohlížeč na celou obrazovku (F11).
        </p>
        <div className="flex flex-wrap gap-2">
          <BtnLink href={`/${akce.slug}/tabule`} target="_blank">
            Spustit tabuli ↗
          </BtnLink>
          <BtnLink
            href={`/${akce.slug}/tabule?dle=kategorie`}
            variant="ghost"
            target="_blank"
          >
            Po kategoriích (střídá) ↗
          </BtnLink>
          <BtnLink
            href={`/admin/akce/${id}/moderator`}
            variant="ghost"
            target="_blank"
          >
            Moderátorská obrazovka ↗
          </BtnLink>
        </div>
      </Card>

      {/* Zálohy */}
      <Card className="p-5">
        <div className="cal-eyebrow mb-3 text-teal-600">Záloha akce (JSON)</div>
        <div className="flex flex-col gap-5">
          <div>
            <Link
              href={`/admin/akce/${id}/zaloha`}
              className="cal-press inline-flex items-center justify-center gap-2 rounded-[10px] border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
            >
              ↓ Stáhnout zálohu
            </Link>
            <p className="mt-2 text-xs text-ink-500">
              Kompletní snapshot (akce, kategorie, závodníci, průchody). Dělej
              před i po závodě.
            </p>
          </div>
          <div>
            <p className="cal-label mb-2">Obnovit ze zálohy</p>
            <ObnovaForm akceId={id} />
            <p className="mt-2 text-xs text-warning">
              Pozor: přepíše aktuální stav této akce daty ze souboru.
            </p>
          </div>
        </div>
      </Card>

      {/* Lokální automatické zálohy */}
      <div className="mt-6">
        <LokalniZalohy akceId={id} />
      </div>
      </div>
    </SpravaShell>
  );
}
