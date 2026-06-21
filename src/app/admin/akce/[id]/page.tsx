import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT, kategorie as katT, zavodnik as zavT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { upravitAkci, smazatAkci } from "@/server/akce";
import { AkceFormFields } from "../../_components/akce-form";

export const dynamic = "force-dynamic";

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

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Administrace
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">{akce.nazev}</h1>
      <p className="mb-6 text-sm text-gray-500">
        Veřejná URL:{" "}
        <Link href={`/${akce.slug}`} target="_blank" className="text-blue-600 underline">
          /{akce.slug} ↗
        </Link>
      </p>

      <nav className="mb-8 grid grid-cols-2 gap-3">
        <SekceKarta
          href={`/admin/akce/${id}/kategorie`}
          titul="Kategorie"
          popis={`${kategorie} kategorií`}
        />
        <SekceKarta
          href={`/admin/akce/${id}/zavodnici`}
          titul="Závodníci"
          popis={`${zavodnici} závodníků${bezKategorie ? ` · ${bezKategorie} bez kategorie` : ""}`}
        />
        <SekceKarta
          href={`/admin/akce/${id}/import`}
          titul="Import z Excelu"
          popis="přihlášky .xls/.xlsx"
        />
        <SekceKarta
          href={`/admin/akce/${id}/mereni`}
          titul="Měření"
          popis="cílová obrazovka"
        />
      </nav>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Úprava akce</h2>
        <form action={upravitAkci.bind(null, id)} className="flex flex-col gap-6">
          <AkceFormFields akce={akce} />
          <button
            type="submit"
            className="self-start rounded-md bg-black px-4 py-2 font-medium text-white"
          >
            Uložit změny
          </button>
        </form>
      </section>

      <section className="border-t pt-6">
        <form action={smazatAkci.bind(null, id)}>
          <button className="text-sm text-red-600 underline">
            Smazat akci (včetně kategorií, závodníků a záznamů)
          </button>
        </form>
      </section>
    </main>
  );
}

function SekceKarta({
  href,
  titul,
  popis,
}: {
  href: string;
  titul: string;
  popis: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border p-4 transition-colors hover:bg-gray-50"
    >
      <div className="font-medium">{titul}</div>
      <div className="text-sm text-gray-500">{popis}</div>
    </Link>
  );
}
