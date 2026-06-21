import Link from "next/link";
import { signOut } from "@/auth/nextauth";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";

/**
 * Rozcestník administrace. Zatím jen seznam akcí — jednotlivé sekce
 * (kategorie, import, měření, listiny) přibudou v dalších milnících.
 */
export default async function AdminPage() {
  const akce = await db.query.akce.findMany({
    orderBy: (a, { desc }) => [desc(a.datum)],
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Administrace</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/prihlaseni" });
          }}
        >
          <button className="text-sm text-gray-500 underline">Odhlásit</button>
        </form>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium">Akce</h2>
        {akce.length === 0 ? (
          <p className="text-sm text-gray-500">
            Zatím žádné akce. (Správa akcí přibude v dalším milníku.)
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {akce.map((a) => (
              <li key={a.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{a.nazev}</div>
                  <div className="text-sm text-gray-500">
                    {a.datum} · {a.misto ?? "—"}
                  </div>
                </div>
                <Link
                  href={`/${a.slug}`}
                  className="text-sm text-blue-600 underline"
                >
                  veřejná stránka
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
