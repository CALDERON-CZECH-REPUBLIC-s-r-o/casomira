import Link from "next/link";
import { signOut } from "@/auth/nextauth";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { db } from "@/db/client";
import { BtnLink, Card, PageHeader } from "./_components/ui";

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
      <PageHeader
        eyebrow="Časomíra"
        title="Administrace"
        actions={
          <>
            <BtnLink href="/admin/akce/nova">+ Nová akce</BtnLink>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/prihlaseni" });
              }}
            >
              <button className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-500 transition-colors hover:text-ink-800">
                Odhlásit
              </button>
            </form>
          </>
        }
      />

      <section>
        <div className="cal-eyebrow mb-3">Akce</div>
        {akce.length === 0 ? (
          <Card className="p-6 text-sm text-ink-500">Zatím žádné akce.</Card>
        ) : (
          <Card className="divide-y divide-ink-150 overflow-hidden">
            {akce.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-ink-50"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/akce/${a.id}`}
                    className="font-semibold text-ink-900 hover:text-teal-700"
                  >
                    {a.nazev}
                  </Link>
                  <div className="mt-0.5 font-technical text-[12px] text-ink-500">
                    {a.datum} · {a.misto ?? "—"}
                  </div>
                </div>
                <Link
                  href={`/${a.slug}`}
                  className="flex-none text-[13px] font-medium text-teal-600 hover:text-teal-700"
                  target="_blank"
                >
                  veřejná stránka ↗
                </Link>
              </div>
            ))}
          </Card>
        )}
      </section>
    </main>
  );
}
