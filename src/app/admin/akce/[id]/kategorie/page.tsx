import Link from "next/link";
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
      <Link
        href={`/admin/akce/${id}`}
        className="text-sm text-gray-500 hover:underline"
      >
        ← {akce.nazev}
      </Link>
      <div className="mb-4 mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kategorie</h1>
        <form action={spustitPrepocet}>
          <button className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
            ↻ Přepočítat zařazení
          </button>
        </form>
      </div>

      {sp.z !== undefined && (
        <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Přepočteno: změněno {sp.z} závodníků
          {Number(sp.n) > 0
            ? `, ${sp.n} zůstává bez kategorie (k řešení)`
            : ", všichni zařazeni"}
          .
        </p>
      )}

      <p className="mb-6 text-sm text-gray-500">
        Referenční rok pro výpočet věku: <strong>{akce.rok}</strong>. Zařazení
        vyhrává první vyhovující kategorie podle pořadí.
      </p>

      <section className="mb-8">
        {kategorie.length === 0 ? (
          <p className="text-sm text-gray-500">Zatím žádné kategorie.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {kategorie.map((kat) => (
              <li key={kat.id} className="rounded-md border">
                <details>
                  <summary className="flex cursor-pointer items-center justify-between p-3">
                    <span>
                      <span className="font-medium">
                        {kat.kod ? `${kat.kod} — ` : ""}
                        {kat.nazev}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {popisPravidla(kat)}
                      </span>
                    </span>
                    <span className="text-xs text-gray-400">upravit ▾</span>
                  </summary>
                  <div className="border-t p-3">
                    <form
                      action={upravitKategorii.bind(null, kat.id, id)}
                      className="flex flex-col gap-3"
                    >
                      <KategorieFormFields kat={kat} />
                      <div className="flex items-center gap-4">
                        <button className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white">
                          Uložit
                        </button>
                      </div>
                    </form>
                    <form
                      action={smazatKategorii.bind(null, kat.id, id)}
                      className="mt-2"
                    >
                      <button className="text-sm text-red-600 underline">
                        Smazat kategorii
                      </button>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border border-dashed p-4">
        <h2 className="mb-3 text-lg font-medium">Nová kategorie</h2>
        <form
          action={vytvoritKategorii.bind(null, id)}
          className="flex flex-col gap-3"
        >
          <KategorieFormFields />
          <button className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
            Přidat kategorii
          </button>
        </form>
      </section>
    </main>
  );
}
