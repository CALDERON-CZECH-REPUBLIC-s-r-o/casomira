import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT } from "@/db/schema";
import { env } from "@/lib/env";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { PublishPanel, ObnovaForm } from "./publish-panel";

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

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link
        href={`/admin/akce/${id}`}
        className="text-sm text-gray-500 hover:underline"
      >
        ← {akce.nazev}
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">Publikování na web</h1>
      <p className="mb-6 text-sm text-gray-500">
        Jednosměrný push výsledků na cloud pro vzdálené diváky. Měření běží
        lokálně — publikování je best-effort, výpadek sítě měření neovlivní.
      </p>

      {/* Publikování */}
      <section className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Cloud</h2>
        {nakonfigurovano ? (
          <>
            <p className="mb-3 text-sm text-gray-600">
              Veřejná adresa:{" "}
              <a
                href={cloudUrl!}
                target="_blank"
                className="text-blue-600 underline"
              >
                {cloudUrl}
              </a>
            </p>
            <PublishPanel akceId={id} nakonfigurovano={nakonfigurovano} />
          </>
        ) : (
          <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
            Cloud sync není nakonfigurován. Nastav <code>CLOUD_SYNC_URL</code> (na
            lokální instanci) a stejný <code>SYNC_TOKEN</code> na obou instancích.
            Bez toho publikování nefunguje — veřejný web ale jede i lokálně na
            <code> /{akce.slug}</code>.
          </p>
        )}
      </section>

      {/* Zálohy */}
      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Záloha akce (JSON)</h2>
        <div className="flex flex-col gap-4">
          <div>
            <a
              href={`/admin/akce/${id}/zaloha`}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              ↓ Stáhnout zálohu
            </a>
            <p className="mt-1 text-xs text-gray-500">
              Kompletní snapshot (akce, kategorie, závodníci, průchody). Dělej
              před i po závodě.
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Obnovit ze zálohy</p>
            <ObnovaForm akceId={id} />
            <p className="mt-1 text-xs text-amber-700">
              Pozor: přepíše aktuální stav této akce daty ze souboru.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
