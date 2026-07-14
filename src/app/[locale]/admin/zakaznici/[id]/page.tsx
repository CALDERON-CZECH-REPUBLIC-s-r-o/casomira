import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { uzivatel as uzivatelT, akce as akceT } from "@/db/schema";
import { vyzadujSuperAdmina } from "@/auth/guard";
import { nactiFakturaceKonfig, oznacitAkciUhrazeno } from "@/server/fakturace";
import { ucetNaIban, spayd } from "@/lib/platba";
import { qrSvgDataUri } from "@/lib/qr";
import { BackLink, Card, Pill } from "../../_components/ui";

export const dynamic = "force-dynamic";

export default async function ZakaznikDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujSuperAdmina();
  const { id } = await params;

  const o = await db.query.uzivatel.findFirst({
    where: eq(uzivatelT.id, id),
  });
  if (!o) notFound();

  const konfig = await nactiFakturaceKonfig();
  const akce = await db.query.akce.findMany({
    where: eq(akceT.uzivatelId, id),
    orderBy: (a, { desc }) => [desc(a.datum)],
  });

  const neuhrazeno = akce.filter((a) => !a.fakturaceUhrazeno).length;
  const castka = neuhrazeno * konfig.cenaZaAkci;

  // QR podklad k platbě (SPAYD) — jen když je nastaven účet a je co platit.
  const iban = ucetNaIban(konfig.ucet);
  const vs = (o.ico ?? "").replace(/\D/g, "").slice(0, 10) || undefined;
  const qr =
    iban && castka > 0
      ? await qrSvgDataUri(
          spayd({
            iban,
            castka,
            vs,
            zprava: `${konfig.firma || "Casomir"} — ${o.firma || o.email}`,
          }),
        )
      : null;

  return (
    <main className="min-h-screen bg-ink-50">
      <div className="cal-dots border-b border-ink-200 bg-[rgba(248,250,249,.92)]">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="mb-3">
            <BackLink href="/admin/zakaznici">Zákazníci</BackLink>
          </div>
          <div className="cal-eyebrow mb-1 text-teal-600">Zákazník</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {o.firma || o.jmeno || o.email}
          </h1>
          <p className="mt-1.5 font-technical text-sm text-ink-500">
            {o.email}
            {o.ico ? ` · IČO ${o.ico}` : ""}
            {o.dic ? ` · DIČ ${o.dic}` : ""}
            {o.telefon ? ` · ${o.telefon}` : ""}
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-4xl space-y-8 px-6 py-6">
        {/* Fakturace */}
        <div>
          <div className="cal-eyebrow mb-3 text-teal-600">Fakturace</div>
          <Card className="flex flex-wrap items-center gap-6 p-5">
            <div>
              <div className="font-display text-3xl font-bold text-ink-900">
                {castka} Kč
              </div>
              <div className="mt-1 text-sm text-ink-500">
                {neuhrazeno} neuhrazených akcí × {konfig.cenaZaAkci} Kč
                {akce.length > 0 ? ` · celkem ${akce.length} akcí` : ""}
              </div>
            </div>
            {qr ? (
              <div className="ml-auto flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt="QR platba"
                  className="h-28 w-28 rounded-[10px] border border-ink-150 bg-white p-1.5"
                />
                <div className="text-[12px] text-ink-500">
                  QR platba
                  {vs ? (
                    <div className="font-technical">VS {vs}</div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="ml-auto max-w-xs text-[13px] text-ink-400">
                {konfig.ucet
                  ? "Vše uhrazeno."
                  : "Nastav účet platformy v sekci Zákazníci → Nastavení fakturace."}
              </p>
            )}
          </Card>
        </div>

        {/* Akce zákazníka */}
        <div>
          <div className="cal-eyebrow mb-3 text-teal-600">
            Akce ({akce.length})
          </div>
          {akce.length === 0 ? (
            <p className="text-sm text-ink-400">Pořadatel zatím nemá žádné akce.</p>
          ) : (
            <Card className="divide-y divide-ink-150 overflow-hidden">
              {akce.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink-900">
                      {a.nazev}
                    </div>
                    <div className="font-technical text-[12px] tabular-nums text-ink-500">
                      {a.datum}
                      {a.misto ? ` · ${a.misto}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-3">
                    {a.fakturaceUhrazeno ? (
                      <Pill ton="success">uhrazeno</Pill>
                    ) : (
                      <Pill ton="warning">neuhrazeno</Pill>
                    )}
                    <form
                      action={oznacitAkciUhrazeno.bind(
                        null,
                        a.id,
                        !a.fakturaceUhrazeno,
                      )}
                    >
                      <button className="text-[13px] font-medium text-teal-600 hover:underline">
                        {a.fakturaceUhrazeno ? "Zrušit" : "Uhrazeno"}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}
