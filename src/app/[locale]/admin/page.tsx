import { Calendar } from "lucide-react";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/auth/nextauth";
import { vyzadujSchvaleneho } from "@/auth/guard";
import { db } from "@/db/client";
import { akce as akceT } from "@/db/schema";
import { BtnLink, Card, EmptyState, Pill, PoweredBy } from "./_components/ui";
import { LangToggle } from "@/components/lang-toggle";

export const dynamic = "force-dynamic";

/**
 * Rozcestník administrace — seznam akcí + založení nové. Pořadatel vidí jen své
 * akce; globální admin vidí všechny + odkaz na panel zákazníků.
 */
export default async function AdminPage() {
  const { uzivatel } = await vyzadujSchvaleneho();
  const jeSuperadmin = uzivatel.role === "superadmin";
  const t = await getTranslations("admin");
  const akce = await db.query.akce.findMany({
    where: jeSuperadmin ? undefined : eq(akceT.uzivatelId, uzivatel.id),
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
            <div className="cal-eyebrow mb-1 text-teal-600">
              {t("administration")}
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
              {t("dash.yourRaces")}
            </h1>
          </div>
          <div className="flex flex-none items-center gap-4">
            {jeSuperadmin && (
              <>
                <Link
                  href="/admin/zakaznici"
                  className="font-technical text-[11px] uppercase tracking-[.08em] text-teal-600 transition-colors hover:text-teal-800"
                >
                  {t("dash.zakaznici")}
                </Link>
                <Link
                  href="/admin/email"
                  className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-500 transition-colors hover:text-ink-800"
                >
                  {t("dash.email")}
                </Link>
              </>
            )}
            <Link
              href="/admin/vyvoj"
              className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-500 transition-colors hover:text-ink-800"
            >
              {t("dash.vyvoj")}
            </Link>
            <Link
              href="/admin/historie"
              className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-500 transition-colors hover:text-ink-800"
            >
              {t("dash.historie")}
            </Link>
            <Link
              href="/admin/obsah"
              className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-500 transition-colors hover:text-ink-800"
            >
              {t("dash.obsah")}
            </Link>
            <Link
              href="/admin/sms"
              className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-500 transition-colors hover:text-ink-800"
            >
              {t("dash.sms")}
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/prihlaseni" });
              }}
            >
              <button className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-500 transition-colors hover:text-ink-800">
                {t("dash.logout")}
              </button>
            </form>
            <LangToggle />
            <BtnLink href="/admin/akce/nova">{t("dash.newEvent")}</BtnLink>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-3xl p-6">
        {akce.length === 0 ? (
          <EmptyState
            icon={<Calendar size={28} strokeWidth={1.75} />}
            title={t("dash.emptyTitle")}
            desc={t("dash.emptyDesc")}
            actions={
              <BtnLink href="/admin/akce/nova">{t("dash.emptyCta")}</BtnLink>
            }
          />
        ) : (
          <Card className="divide-y divide-ink-150 overflow-hidden">
            {akce.map((a) => {
              const start = a.casStartu ? new Date(a.casStartu) : null;
              const stav =
                start && start.getTime() < nowMs ? (
                  <Pill ton="ink">{t("dash.done")}</Pill>
                ) : start ? (
                  <Pill ton="teal" dot>
                    {t("dash.ready")}
                  </Pill>
                ) : (
                  <Pill ton="info">{t("dash.entries")}</Pill>
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
                    {t("dash.publicPage")}
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
