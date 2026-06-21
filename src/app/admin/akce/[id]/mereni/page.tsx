import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT, cilovyZaznam, zavodnik as zavT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { MereniScreen } from "./mereni-screen";

export const dynamic = "force-dynamic";

export default async function MereniPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const zavodnici = await db.query.zavodnik.findMany({
    where: eq(zavT.akceId, id),
    columns: { startovniCislo: true, jmeno: true, prijmeni: true },
  });

  const zaznamy = await db.query.cilovyZaznam.findMany({
    where: eq(cilovyZaznam.akceId, id),
    orderBy: (z, { asc }) => [asc(z.poradiDoteku)],
  });

  return (
    <main className="mx-auto max-w-5xl p-4">
      <Link
        href={`/admin/akce/${id}`}
        className="text-sm text-gray-500 hover:underline"
      >
        ← {akce.nazev}
      </Link>
      <MereniScreen
        akceId={id}
        casStartu={akce.casStartu ? akce.casStartu.toISOString() : null}
        zavodnici={zavodnici.map((z) => ({
          startovniCislo: z.startovniCislo,
          jmeno: z.jmeno,
          prijmeni: z.prijmeni,
        }))}
        pocatecniZaznamy={zaznamy.map((z) => ({
          clientId: z.clientId,
          akceId: id,
          casCile: z.casCile.toISOString(),
          startovniCislo: z.startovniCislo,
          stav: z.stav,
          poradiDoteku: z.poradiDoteku ?? 0,
          dirty: false,
        }))}
      />
    </main>
  );
}
