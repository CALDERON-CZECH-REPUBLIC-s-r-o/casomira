import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { upravitAkci, ulozitNastaveni, smazatAkci } from "@/server/akce";
import { Btn, BtnLink, Card, PageHeader } from "@/app/admin/_components/ui";
import { ConfirmDialog } from "@/app/admin/_components/ui-client";
import { SpravaShell } from "@/app/admin/_components/sprava-shell";
import { AkceFormFields } from "@/app/admin/_components/akce-form";

export const dynamic = "force-dynamic";

export default async function NastaveniPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;
  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-3xl p-8">
        <PageHeader eyebrow="Nastavení" title="Nastavení akce" />

        {/* 1. Základní údaje */}
        <Card className="mb-6 p-5">
          <div className="cal-eyebrow mb-4 text-teal-600">Základní údaje</div>
          <form action={upravitAkci.bind(null, id)}>
            <AkceFormFields akce={akce} />
            <div className="mt-5">
              <Btn type="submit">Uložit</Btn>
            </div>
          </form>
        </Card>

        {/* 2. Veřejná stránka & měření */}
        <Card className="mb-6 p-5">
          <div className="cal-eyebrow mb-4 text-teal-600">
            Veřejná stránka &amp; měření
          </div>
          <form action={ulozitNastaveni.bind(null, id)}>
            <div className="flex flex-col gap-5">
              <label className="cal-label">
                Odkaz veřejné stránky
                <div className="flex items-center gap-1 rounded-[10px] border border-ink-200 bg-white pl-3 focus-within:border-teal-400">
                  <span className="font-technical text-sm text-ink-400">/</span>
                  <input
                    name="slug"
                    defaultValue={akce.slug}
                    placeholder="nazev-akce"
                    className="flex-1 border-0 bg-transparent px-1 py-2 text-sm font-medium text-ink-900 outline-none"
                  />
                </div>
                <span className="flex flex-wrap items-center gap-x-3 text-xs">
                  <a
                    href={`/${akce.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-600 hover:underline"
                  >
                    otevřít /{akce.slug} ↗
                  </a>
                  <span className="text-warning">
                    Změna odkazu rozbije dřív sdílené URL a QR.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="verejna"
                  defaultChecked={akce.verejna}
                  className="mt-0.5 h-4 w-4 flex-none accent-teal-500"
                />
                <span className="text-sm">
                  <span className="font-medium text-ink-900">
                    Veřejná stránka viditelná
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="autoPublikace"
                  defaultChecked={akce.autoPublikace}
                  className="mt-0.5 h-4 w-4 flex-none accent-teal-500"
                />
                <span className="text-sm">
                  <span className="font-medium text-ink-900">
                    Automaticky publikovat na cloud
                  </span>
                </span>
              </label>

              <label className="cal-label">
                Přesnost zobrazeného času
                <select
                  name="presnostCasu"
                  defaultValue={akce.presnostCasu}
                  className="cal-input"
                >
                  <option value="sekundy">Sekundy</option>
                  <option value="desetiny">Desetiny</option>
                  <option value="setiny">Setiny</option>
                </select>
              </label>

              <label className="cal-label">
                Délka trati (m)
                <input
                  type="number"
                  name="delkaM"
                  defaultValue={akce.delkaM ?? ""}
                  className="cal-input"
                />
              </label>
            </div>
            <div className="mt-5">
              <Btn type="submit">Uložit nastavení</Btn>
            </div>
          </form>
        </Card>

        {/* 3. Záloha */}
        <Card className="mb-6 p-5">
          <div className="cal-eyebrow mb-4 text-teal-600">Záloha</div>
          <BtnLink variant="ghost" href={`/admin/akce/${id}/zaloha`}>
            Stáhnout zálohu (JSON)
          </BtnLink>
          <p className="mt-3 text-sm text-ink-500">
            Obnovu ze zálohy najdeš v{" "}
            <Link
              href={`/admin/akce/${id}/publikovat`}
              className="text-teal-600 hover:underline"
            >
              Publikování
            </Link>
            .
          </p>
        </Card>

        {/* 4. Nebezpečná zóna */}
        <div className="border-t border-ink-200 pt-6">
          <div className="cal-eyebrow mb-3 text-error">Nebezpečná zóna</div>
          <ConfirmDialog
            title="Smazat akci?"
            message="Tuto akci i všechna její data nelze po smazání obnovit."
            dopady={[
              "Smažou se závodníci a kategorie akce",
              "Smažou se všechny cílové záznamy a měření",
              "Veřejná stránka přestane existovat",
            ]}
            slovo="SMAZAT"
            confirmLabel="Smazat akci"
            action={smazatAkci.bind(null, id)}
            triggerLabel="Smazat akci…"
            triggerClassName="text-sm font-semibold text-error hover:underline"
          />
        </div>
      </div>
    </SpravaShell>
  );
}
