import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ClipboardList, Check, Phone, Mail } from "lucide-react";
import { db } from "@/db/client";
import { akce as akceT, prihlaska as prihT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { ucetNaIban, spayd } from "@/lib/platba";
import { qrSvgDataUri } from "@/lib/qr";
import {
  schvalitPrihlasku,
  zamitnoutPrihlasku,
  oznacitZaplaceno,
  smazatPrihlasku,
  smazatSpamPrihlasky,
} from "@/server/prihlasky";
import { Btn, Card, EmptyState, PageHeader, Pill } from "../../../_components/ui";
import { ConfirmDialog } from "@/app/[locale]/admin/_components/ui-client";
import { SpravaShell } from "@/app/[locale]/admin/_components/sprava-shell";

export const dynamic = "force-dynamic";

const STAV: Record<string, { label: string; ton: "info" | "success" | "ink" }> = {
  nova: { label: "Nová", ton: "info" },
  schvalena: { label: "Ve startovce", ton: "success" },
  zamitnuta: { label: "Zamítnutá", ton: "ink" },
};

export default async function PrihlaskyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const prihlasky = await db.query.prihlaska.findMany({
    where: eq(prihT.akceId, id),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  // QR platby per přihláška (jen když je účet i startovné).
  const iban = ucetNaIban(akce.ucet);
  const platba = iban && akce.startovne && akce.startovne > 0;
  const qr = new Map<string, string>();
  if (platba) {
    await Promise.all(
      prihlasky.map(async (p) => {
        const kod = spayd({
          iban,
          castka: akce.startovne,
          vs: p.variabilniSymbol,
          zprava: `Startovne ${akce.nazev}`,
        });
        qr.set(p.id, await qrSvgDataUri(kod));
      }),
    );
  }

  const cekajici = prihlasky.filter((p) => p.stav === "nova").length;
  const spamPocet = prihlasky.filter(
    (p) => p.stav === "nova" && !p.zaplaceno,
  ).length;

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-4xl p-8">
        <PageHeader
          eyebrow="Přihlášky"
          title="Přihlášky"
          desc={
            <span className="font-technical tabular-nums">
              {prihlasky.length} celkem
              {cekajici > 0 ? ` · ${cekajici} čeká na schválení` : ""}
            </span>
          }
          actions={
            spamPocet > 0 ? (
              <ConfirmDialog
                title="Smazat nové nezaplacené?"
                message={`Smaže se ${spamPocet} přihlášek se stavem „Nová" a bez úhrady (typicky spam). Schválené a zaplacené zůstanou.`}
                slovo="SMAZAT"
                confirmLabel={`Smazat ${spamPocet}`}
                action={smazatSpamPrihlasky.bind(null, id)}
                triggerLabel={`Smazat nové nezaplacené (${spamPocet})`}
                triggerClassName="cal-press rounded-[10px] border border-ink-200 bg-white px-3 py-1.5 text-[13px] font-medium text-error hover:bg-error-bg"
              />
            ) : undefined
          }
        />

        {!akce.registraceOtevrena && (
          <p className="mb-6 rounded-[10px] bg-info-bg px-4 py-3 text-sm text-info">
            Veřejné přihlašování je vypnuté. Zapnout ho můžete v{" "}
            <a href={`/admin/akce/${id}/nastaveni`} className="font-semibold underline">
              Nastavení akce
            </a>
            .
          </p>
        )}

        {prihlasky.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} strokeWidth={1.75} />}
            title="Zatím žádné přihlášky"
            desc="Přihlášky z veřejné stránky akce se objeví tady. Startovné + QR platbu nastavíte v Nastavení akce."
          />
        ) : (
          <div className="space-y-3">
            {prihlasky.map((p) => {
              const stav = STAV[p.stav] ?? STAV.nova;
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex flex-wrap items-start gap-4">
                    {/* Osoba + kontakt */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-900">
                          {p.prijmeni} {p.jmeno}
                        </span>
                        <Pill ton={stav.ton}>{stav.label}</Pill>
                        {p.zaplaceno ? (
                          <Pill ton="success" dot>
                            Zaplaceno
                          </Pill>
                        ) : platba ? (
                          <Pill ton="warning" dot>
                            Nezaplaceno
                          </Pill>
                        ) : null}
                      </div>
                      <div className="mt-1 font-technical text-[12px] tabular-nums text-ink-500">
                        {p.rokNarozeni ? `roč. ${p.rokNarozeni}` : "roč. —"}
                        {p.oddil ? ` · ${p.oddil}` : ""}
                        {` · VS ${p.variabilniSymbol}`}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-600">
                        {p.telefon && (
                          <a
                            href={`tel:${p.telefon}`}
                            className="inline-flex items-center gap-1 hover:text-teal-700"
                          >
                            <Phone size={13} /> {p.telefon}
                          </a>
                        )}
                        {p.email && (
                          <a
                            href={`mailto:${p.email}`}
                            className="inline-flex items-center gap-1 hover:text-teal-700"
                          >
                            <Mail size={13} /> {p.email}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* QR platba */}
                    {qr.has(p.id) && (
                      <div className="flex-none text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qr.get(p.id)}
                          alt={`QR platba VS ${p.variabilniSymbol}`}
                          className="h-24 w-24 rounded-[8px] border border-ink-150 bg-white p-1"
                        />
                        <div className="mt-1 cal-eyebrow text-ink-400">
                          {akce.startovne} Kč
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Akce */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-150 pt-3">
                    {p.stav !== "schvalena" && (
                      <form action={schvalitPrihlasku.bind(null, p.id)}>
                        <Btn type="submit" className="text-[13px]">
                          Přijmout do startovky
                        </Btn>
                      </form>
                    )}
                    <form
                      action={oznacitZaplaceno.bind(null, p.id, !p.zaplaceno)}
                    >
                      <Btn type="submit" variant="ghost" className="text-[13px]">
                        {p.zaplaceno ? (
                          "Označit nezaplaceno"
                        ) : (
                          <>
                            <Check size={14} /> Zaplaceno
                          </>
                        )}
                      </Btn>
                    </form>
                    {p.stav !== "zamitnuta" && p.stav !== "schvalena" && (
                      <form action={zamitnoutPrihlasku.bind(null, p.id)}>
                        <button
                          type="submit"
                          className="cal-press rounded-[10px] px-3 py-1.5 text-[13px] font-medium text-ink-500 hover:bg-ink-100"
                        >
                          Zamítnout
                        </button>
                      </form>
                    )}
                    <form
                      action={smazatPrihlasku.bind(null, p.id)}
                      className="ml-auto"
                    >
                      <button
                        type="submit"
                        className="cal-press rounded-[10px] px-3 py-1.5 text-[13px] font-medium text-error hover:bg-error-bg"
                      >
                        Smazat
                      </button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SpravaShell>
  );
}
