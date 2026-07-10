import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT, zavodnik as zavT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { BtnLink, Card, PageHeader } from "../../../_components/ui";
import { SpravaShell } from "@/app/[locale]/admin/_components/sprava-shell";

export const dynamic = "force-dynamic";

export default async function ListinyHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();
  const pocet = await db.$count(zavT, eq(zavT.akceId, id));

  const base = `/admin/akce/${id}/listiny`;
  const exp = (q: string) => `${base}/export?${q}`;

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-4xl p-8">
      <PageHeader
        eyebrow="Listiny"
        title="Startovní a výsledkové listiny"
        desc={
          <>
            <span className="font-technical">{pocet}</span> závodníků
          </>
        }
      />

      {pocet === 0 && (
        <p className="mb-6 rounded-[10px] bg-warning-bg p-3 text-sm text-warning">
          Akce nemá závodníky — naimportuj přihlášky.
        </p>
      )}

      {/* Startovní */}
      <section className="mb-8">
        <div className="cal-eyebrow mb-3">Startovní listina</div>
        <Card className="flex flex-col gap-4 p-5">
          <Radek popis="Náhled / tisk">
            <Tlac href={`${base}/startovni?rozsah=celkova&sort=cislo`}>
              celková (dle čísla)
            </Tlac>
            <Tlac href={`${base}/startovni?rozsah=celkova&sort=abeceda`}>
              celková (abecedně)
            </Tlac>
            <Tlac href={`${base}/startovni?rozsah=kategorie&sort=cislo`}>
              po kategoriích
            </Tlac>
          </Radek>
          <Radek popis="Stáhnout">
            <Tlac href={exp("typ=startovni&format=pdf&rozsah=celkova&sort=cislo")}>
              PDF
            </Tlac>
            <Tlac href={exp("typ=startovni&format=xlsx&sort=cislo")}>XLSX</Tlac>
          </Radek>
        </Card>
      </section>

      {/* Výsledková */}
      <section>
        <div className="cal-eyebrow mb-3">Výsledková listina</div>
        <Card className="flex flex-col gap-4 p-5">
          <Radek popis="Náhled / tisk">
            <Tlac href={`${base}/vysledkova?rozsah=kategorie`}>
              po kategoriích
            </Tlac>
            <Tlac href={`${base}/vysledkova?rozsah=celkova`}>celkové pořadí</Tlac>
          </Radek>
          <Radek popis="Stáhnout">
            <Tlac href={exp("typ=vysledkova&format=pdf&rozsah=kategorie")}>
              PDF
            </Tlac>
            <Tlac href={exp("typ=vysledkova&format=xlsx&rozsah=kategorie")}>
              XLSX
            </Tlac>
          </Radek>
        </Card>
      </section>

      {/* Upoutávka na online výsledky */}
      <section className="mt-8">
        <div className="cal-eyebrow mb-3">Leták — upoutávka na online výsledky</div>
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-sm text-ink-500">
            2× A5 na jednu stranu A4 (přeložit/rozstřihnout): logo, název akce,
            datum a QR kód s odkazem na živé výsledky.
          </p>
          <Radek popis="Náhled / tisk">
            <Tlac href={`${base}/letak`}>otevřít leták</Tlac>
          </Radek>
        </Card>
      </section>

      <section className="mt-8 border-t border-ink-200 pt-6">
        <div className="cal-eyebrow mb-3">Historická data</div>
        <BtnLink href={`/admin/akce/${id}/import-vysledky`} variant="ghost">
          Import historických výsledků z PDF
        </BtnLink>
      </section>
      </div>
    </SpravaShell>
  );
}

function Radek({
  popis,
  children,
}: {
  popis: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-24 shrink-0 text-sm text-ink-500">{popis}:</span>
      {children}
    </div>
  );
}

function Tlac({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <BtnLink href={href} target="_blank" variant="ghost">
      {children}
    </BtnLink>
  );
}
