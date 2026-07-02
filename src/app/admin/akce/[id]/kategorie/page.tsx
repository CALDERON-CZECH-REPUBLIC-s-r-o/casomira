import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT, kategorie as katT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import {
  vytvoritKategorii,
  upravitKategorii,
  smazatKategorii,
  prepocitatZarazeni,
} from "@/server/kategorie";
import {
  KategorieFormFields,
  popisPravidla,
} from "../../../_components/kategorie-form";
import { Btn, Card, PageHeader } from "../../../_components/ui";

export const dynamic = "force-dynamic";

export default async function KategoriePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ z?: string; n?: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;
  const sp = await searchParams;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const kategorie = await db.query.kategorie.findMany({
    where: eq(katT.akceId, id),
    orderBy: (k, { asc }) => [asc(k.poradi), asc(k.nazev)],
  });

  async function spustitPrepocet() {
    "use server";
    const r = await prepocitatZarazeni(id);
    redirect(`/admin/akce/${id}/kategorie?z=${r.zmeneno}&n=${r.nezarazeno}`);
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <PageHeader
        back={{ href: `/admin/akce/${id}`, label: akce.nazev }}
        eyebrow="Kategorie"
        title="Kategorie"
        desc={
          <>
            Referenční rok pro výpočet věku:{" "}
            <strong className="font-technical tabular-nums text-ink-700">
              {akce.rok}
            </strong>
            . Zařazení vyhrává první vyhovující kategorie podle pořadí.
          </>
        }
        actions={
          <form action={spustitPrepocet}>
            <Btn type="submit" variant="ghost">
              ↻ Přepočítat zařazení
            </Btn>
          </form>
        }
      />

      {sp.z !== undefined && (
        <p className="mb-6 rounded-[10px] bg-success-bg p-3 text-sm text-success">
          Přepočteno: změněno {sp.z} závodníků
          {Number(sp.n) > 0
            ? `, ${sp.n} zůstává bez kategorie (k řešení)`
            : ", všichni zařazeni"}
          .
        </p>
      )}

      <section className="mb-8">
        {kategorie.length === 0 ? (
          <Card className="p-6 text-sm text-ink-500">
            Zatím žádné kategorie.
          </Card>
        ) : (
          <Card className="divide-y divide-ink-150 overflow-hidden">
            {kategorie.map((kat) => (
              <details key={kat.id} className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors hover:bg-ink-50">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink-900">
                      {kat.kod ? (
                        <span className="font-technical">{kat.kod} — </span>
                      ) : (
                        ""
                      )}
                      {kat.nazev}
                    </span>
                    <span className="ml-2 text-sm text-ink-500">
                      {popisPravidla(kat)}
                    </span>
                  </span>
                  <span className="flex-none font-technical text-[11px] uppercase tracking-[.08em] text-ink-400">
                    upravit ▾
                  </span>
                </summary>
                <div className="border-t border-ink-150 bg-ink-50 p-4">
                  <form
                    action={upravitKategorii.bind(null, kat.id, id)}
                    className="flex flex-col gap-4"
                  >
                    <KategorieFormFields kat={kat} />
                    <div className="flex items-center gap-4">
                      <Btn type="submit">Uložit</Btn>
                    </div>
                  </form>
                  <form
                    action={smazatKategorii.bind(null, kat.id, id)}
                    className="mt-3"
                  >
                    <button className="text-sm font-medium text-error hover:underline">
                      Smazat kategorii
                    </button>
                  </form>
                </div>
              </details>
            ))}
          </Card>
        )}
      </section>

      <section>
        <div className="cal-eyebrow mb-3">Nová kategorie</div>
        <Card className="p-5">
          <form
            action={vytvoritKategorii.bind(null, id)}
            className="flex flex-col gap-4"
          >
            <KategorieFormFields />
            <Btn type="submit" className="self-start">
              Přidat kategorii
            </Btn>
          </form>
        </Card>
      </section>
    </main>
  );
}
