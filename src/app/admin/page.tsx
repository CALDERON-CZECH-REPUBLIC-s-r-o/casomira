import Link from "next/link";
import { signOut } from "@/auth/nextauth";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";

/**
 * Rozcestník administrace — seznam akcí + založení nové.
 */
export default async function AdminPage() {
  await vyzadujPrihlaseni();
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Akce</h2>
          <Link
            href="/admin/akce/nova"
            className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white"
          >
            + Nová akce
          </Link>
        </div>
        {akce.length === 0 ? (
          <p className="text-sm text-gray-500">Zatím žádné akce.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {akce.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between p-3"
              >
                <div>
                  <Link
                    href={`/admin/akce/${a.id}`}
                    className="font-medium hover:underline"
                  >
                    {a.nazev}
                  </Link>
                  <div className="text-sm text-gray-500">
                    {a.datum} · {a.misto ?? "—"}
                  </div>
                </div>
                <Link
                  href={`/${a.slug}`}
                  className="text-sm text-blue-600 underline"
                  target="_blank"
                >
                  veřejná stránka ↗
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
