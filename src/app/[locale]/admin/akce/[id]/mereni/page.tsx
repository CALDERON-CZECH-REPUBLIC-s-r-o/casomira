import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  cilovyZaznam,
  mericiBod,
  zavodnik as zavT,
} from "@/db/schema";
import { vyzadujAkci } from "@/auth/guard";
import { MereniScreen } from "./mereni-screen";

export const dynamic = "force-dynamic";

export default async function MereniPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { akce } = await vyzadujAkci(id);

  const zavodnici = await db.query.zavodnik.findMany({
    where: eq(zavT.akceId, id),
    columns: { startovniCislo: true, jmeno: true, prijmeni: true, stav: true },
  });

  const zaznamy = await db.query.cilovyZaznam.findMany({
    where: eq(cilovyZaznam.akceId, id),
    orderBy: (z, { asc }) => [asc(z.poradiDoteku)],
  });

  const body = await db.query.mericiBod.findMany({
    where: eq(mericiBod.akceId, id),
    orderBy: (b, { asc }) => [asc(b.poradi)],
    columns: { id: true, nazev: true, jeCil: true },
  });

  return (
    <main className="w-full p-2">
      <MereniScreen
        akceId={id}
        nazev={akce.nazev}
        casStartu={akce.casStartu ? akce.casStartu.toISOString() : null}
        casZastaveni={akce.casZastaveni ? akce.casZastaveni.toISOString() : null}
        zavodnici={zavodnici.map((z) => ({
          startovniCislo: z.startovniCislo,
          jmeno: z.jmeno,
          prijmeni: z.prijmeni,
          stav: z.stav,
        }))}
        pocatecniZaznamy={zaznamy.map((z) => ({
          clientId: z.clientId,
          akceId: id,
          casCile: z.casCile.toISOString(),
          startovniCislo: z.startovniCislo,
          stav: z.stav,
          poradiDoteku: z.poradiDoteku ?? 0,
          bodId: z.bodId,
          dirty: false,
        }))}
        body={body}
      />
    </main>
  );
}
