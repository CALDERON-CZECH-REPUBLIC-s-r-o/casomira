import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT, zavodnik as zavT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";

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
    <main className="mx-auto max-w-2xl p-6">
      <Link
        href={`/admin/akce/${id}`}
        className="text-sm text-gray-500 hover:underline"
      >
        ← {akce.nazev}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold">Listiny</h1>

      {pocet === 0 && (
        <p className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-800">
          Akce nemá závodníky — naimportuj přihlášky.
        </p>
      )}

      {/* Startovní */}
      <section className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Startovní listina</h2>
        <div className="mb-3 flex flex-col gap-2 text-sm">
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
        </div>
      </section>

      {/* Výsledková */}
      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Výsledková listina</h2>
        <div className="flex flex-col gap-2 text-sm">
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
        </div>
      </section>
    </main>
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
      <span className="w-24 shrink-0 text-gray-500">{popis}:</span>
      {children}
    </div>
  );
}

function Tlac({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="rounded-md border px-3 py-1.5 hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}
