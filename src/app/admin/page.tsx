import Link from "next/link";
import { Calendar } from "lucide-react";
import { signOut } from "@/auth/nextauth";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { db } from "@/db/client";
import { BtnLink, Card, EmptyState, Pill, PoweredBy } from "./_components/ui";

export const dynamic = "force-dynamic";

/**
 * Rozcestník administrace — seznam akcí + založení nové.
 */
export default async function AdminPage() {
  await vyzadujPrihlaseni();
  const akce = await db.query.akce.findMany({
    orderBy: (a, { desc }) => [desc(a.datum)],
  });
  // Server komponenta (force-dynamic) — čas se čte jednou za request.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  return (
    <main className="min-h-screen bg-ink-50">
      <div className="cal-dots border-b border-ink-200 bg-[rgba(248,250,249,.92)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-end justify-between gap-4 p-6">
          <div className="min-w-0">
            <div className="cal-eyebrow mb-1 text-teal-600">Administrace</div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
              Vaše závody
            </h1>
          </div>
          <div className="flex flex-none items-center gap-4">
            <Link
              href="/admin/vyvoj"
              className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-500 transition-colors hover:text-ink-800"
            >
              Vývoj časů
            </Link>
            <Link
              href="/admin/obsah"
              className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-500 transition-colors hover:text-ink-800"
            >
              Obsah webu
            </Link>
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
            <BtnLink href="/admin/akce/nova">+ Nová akce</BtnLink>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-3xl p-6">
        {akce.length === 0 ? (
          <EmptyState
            icon={<Calendar size={28} strokeWidth={1.75} />}
            title="Zatím žádné akce"
            desc="Založte svůj první závod a začněte přijímat přihlášky."
            actions={
              <BtnLink href="/admin/akce/nova">Založit první akci</BtnLink>
            }
          />
        ) : (
          <Card className="divide-y divide-ink-150 overflow-hidden">
            {akce.map((a) => {
              const start = a.casStartu ? new Date(a.casStartu) : null;
              const stav =
                start && start.getTime() < nowMs ? (
                  <Pill ton="ink">Dokončeno</Pill>
                ) : start ? (
                  <Pill ton="teal" dot>
                    Připraveno
                  </Pill>
                ) : (
                  <Pill ton="info">Přihlášky</Pill>
                );
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-ink-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/admin/akce/${a.id}`}
                        className="font-semibold text-ink-900 hover:text-teal-700"
                      >
                        {a.nazev}
                      </Link>
                      {stav}
                    </div>
                    <div className="mt-0.5 font-technical text-[12px] tabular-nums text-ink-500">
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
              );
            })}
          </Card>
        )}
      </section>

      <footer className="mx-auto flex max-w-3xl justify-center px-6 pb-8">
        <PoweredBy />
      </footer>
    </main>
  );
}
