import Link from "next/link";
import { db } from "@/db/client";

// Data se mění během měření — vždy čerstvá, žádný statický prerender.
export const dynamic = "force-dynamic";

/**
 * Veřejná úvodní stránka — seznam akcí. Detail akce (startovky + živé výsledky)
 * žije na /{slug} a přibude v milníku M7.
 */
export default async function HomePage() {
  const akce = await db.query.akce.findMany({
    orderBy: (a, { desc }) => [desc(a.datum)],
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Časomíra</h1>
        <p className="text-gray-500">Výsledky závodů online</p>
      </header>

      {akce.length === 0 ? (
        <p className="text-gray-500">Zatím nejsou zveřejněny žádné akce.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {akce.map((a) => (
            <li key={a.id} className="p-4">
              <Link href={`/${a.slug}`} className="font-medium hover:underline">
                {a.nazev}
              </Link>
              <div className="text-sm text-gray-500">
                {a.datum} · {a.misto ?? "—"}
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-10 text-sm text-gray-400">
        <Link href="/admin" className="hover:underline">
          Administrace
        </Link>
      </footer>
    </main>
  );
}
