import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT, zavodnik as zavT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { vekVRoce } from "@/domain/zarazeni";

export const dynamic = "force-dynamic";

const POHLAVI_LABEL: Record<string, string> = { M: "M", Z: "Ž" };

export default async function ZavodniciPage({
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
    orderBy: (z, { asc }) => [asc(z.startovniCislo), asc(z.prijmeni)],
    with: { kategorie: true },
  });

  const bezKategorie = zavodnici.filter((z) => z.kategorieId === null).length;
  const bezPohlavi = zavodnici.filter((z) => z.pohlavi === null).length;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link
        href={`/admin/akce/${id}`}
        className="text-sm text-gray-500 hover:underline"
      >
        ← {akce.nazev}
      </Link>
      <div className="mb-4 mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Závodníci{" "}
          <span className="text-base font-normal text-gray-500">
            ({zavodnici.length})
          </span>
        </h1>
        <Link
          href={`/admin/akce/${id}/import`}
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white"
        >
          + Import z Excelu
        </Link>
      </div>

      {(bezKategorie > 0 || bezPohlavi > 0) && (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          K řešení:{" "}
          {bezPohlavi > 0 && <>{bezPohlavi} bez pohlaví; </>}
          {bezKategorie > 0 && <>{bezKategorie} bez kategorie </>}
          (doplň pohlaví / uprav kategorie a spusť přepočet).
        </p>
      )}

      {zavodnici.length === 0 ? (
        <p className="text-sm text-gray-500">
          Zatím žádní závodníci. Naimportuj přihlášky z Excelu.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b text-left text-gray-500">
            <tr>
              <th className="py-2">Č.</th>
              <th>Příjmení a jméno</th>
              <th>Ročník</th>
              <th>Pohl.</th>
              <th>Oddíl / Město</th>
              <th>Kategorie</th>
            </tr>
          </thead>
          <tbody>
            {zavodnici.map((z) => (
              <tr key={z.id} className="border-b last:border-0">
                <td className="py-1.5">{z.startovniCislo ?? "—"}</td>
                <td>
                  {z.prijmeni} {z.jmeno}
                </td>
                <td>
                  {z.rokNarozeni ?? "—"}
                  {z.rokNarozeni
                    ? ` (${vekVRoce(akce.rok, z.rokNarozeni)} let)`
                    : ""}
                </td>
                <td className={z.pohlavi ? "" : "text-red-500"}>
                  {z.pohlavi ? POHLAVI_LABEL[z.pohlavi] : "?"}
                </td>
                <td>{z.oddil ?? z.mesto ?? "—"}</td>
                <td className={z.kategorie ? "" : "text-amber-600"}>
                  {z.kategorie?.kod ?? z.kategorie?.nazev ?? "— bez kategorie"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
