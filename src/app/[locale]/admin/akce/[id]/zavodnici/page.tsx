import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Users } from "lucide-react";
import { db } from "@/db/client";
import { akce as akceT, zavodnik as zavT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { vekVRoce } from "@/domain/zarazeni";
import { nastavitStavZavodnika } from "@/server/opravy";
import { doplnitPohlaviDleJmen, nastavitPohlavi } from "@/server/zavodnici";
import { prepocitatZarazeni } from "@/server/kategorie";
import { Btn, BtnLink, Card, EmptyState, PageHeader, Pill } from "../../../_components/ui";
import { SpravaShell } from "@/app/[locale]/admin/_components/sprava-shell";
import { ZavodnikFormDialog } from "./zavodnik-form";

export const dynamic = "force-dynamic";

const POHLAVI_LABEL: Record<string, string> = { M: "M", Z: "Ž" };
const ZAV_STAV_LABEL: Record<string, string> = {
  prihlasen: "",
  nenastoupil_DNS: "DNS",
  diskvalifikovan_DSQ: "DSQ",
};

export default async function ZavodniciPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const zavodnici = await db.query.zavodnik.findMany({
    where: eq(zavT.akceId, id),
    orderBy: (z, { asc }) => [asc(z.startovniCislo), asc(z.prijmeni)],
    with: { kategorie: true },
  });

  const bezKategorie = zavodnici.filter((z) => z.kategorieId === null).length;
  const bezPohlavi = zavodnici.filter((z) => z.pohlavi === null).length;

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-4xl p-8">
      <PageHeader
        eyebrow="Závodníci"
        title="Závodníci"
        desc={
          <span className="font-technical tabular-nums">
            {zavodnici.length} přihlášených
          </span>
        }
        actions={
          <>
            <ZavodnikFormDialog akceId={id} triggerLabel="+ Přidat závodníka" />
            <BtnLink href={`/admin/akce/${id}/import`} variant="ghost">
              + Import z Excelu
            </BtnLink>
          </>
        }
      />

      {(bezKategorie > 0 || bezPohlavi > 0) && (
        <div className="mb-4 rounded-[10px] bg-warning-bg p-3 text-sm text-warning">
          <p>
            K řešení:{" "}
            {bezPohlavi > 0 && <>{bezPohlavi} bez pohlaví; </>}
            {bezKategorie > 0 && <>{bezKategorie} bez kategorie </>}
            (doplň pohlaví / uprav kategorie a spusť přepočet).
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <form
              action={async () => {
                "use server";
                await doplnitPohlaviDleJmen(id);
              }}
            >
              <Btn variant="ghost" type="submit">
                Doplnit pohlaví dle jmen
              </Btn>
            </form>
            <form
              action={async () => {
                "use server";
                await prepocitatZarazeni(id);
              }}
            >
              <Btn variant="ghost" type="submit">
                Přepočítat zařazení
              </Btn>
            </form>
          </div>
        </div>
      )}

      {zavodnici.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="Zatím žádní závodníci"
          desc="Naimportuj přihlášky z Excelu, nebo přidej závodníka ručně."
          actions={
            <>
              <BtnLink href={`/admin/akce/${id}/import`}>+ Import z Excelu</BtnLink>
              <ZavodnikFormDialog
                akceId={id}
                triggerLabel="Přidat ručně"
                triggerKind="ghost"
              />
            </>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-150 text-left text-[12px] font-medium uppercase text-ink-500">
              <tr>
                <th className="p-3">Č.</th>
                <th className="p-3">Příjmení a jméno</th>
                <th className="p-3">Ročník</th>
                <th className="p-3">Pohl.</th>
                <th className="p-3">Oddíl / Město</th>
                <th className="p-3">Kategorie</th>
                <th className="p-3">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-150">
              {zavodnici.map((z) => (
                <tr key={z.id} className="hover:bg-ink-50">
                  <td className="p-3 font-technical tabular-nums text-ink-700">
                    {z.startovniCislo ?? "—"}
                  </td>
                  <td className="p-3 text-ink-900">
                    {z.startovniCislo !== null ? (
                      <Link
                        href={`/admin/akce/${id}/zavodnici/${z.startovniCislo}`}
                        className="hover:text-teal-700 hover:underline"
                      >
                        {z.prijmeni} {z.jmeno}
                      </Link>
                    ) : (
                      <>
                        {z.prijmeni} {z.jmeno}
                      </>
                    )}
                  </td>
                  <td className="p-3 font-technical tabular-nums text-ink-700">
                    {z.rokNarozeni ?? "—"}
                    {z.rokNarozeni
                      ? ` (${vekVRoce(akce.rok, z.rokNarozeni)} let)`
                      : ""}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {z.pohlavi ? (
                        <span className="font-medium text-ink-700">
                          {POHLAVI_LABEL[z.pohlavi]}
                        </span>
                      ) : (
                        <span className="font-bold text-error">?</span>
                      )}
                      <PohlaviBtn zavodnikId={z.id} akceId={id} pohlavi="M" aktivni={z.pohlavi === "M"} />
                      <PohlaviBtn zavodnikId={z.id} akceId={id} pohlavi="Z" aktivni={z.pohlavi === "Z"} />
                    </div>
                  </td>
                  <td className="p-3 text-ink-700">{z.oddil ?? z.mesto ?? "—"}</td>
                  <td className={`p-3 ${z.kategorie ? "text-ink-700" : "text-amber-500"}`}>
                    {z.kategorie?.kod ?? z.kategorie?.nazev ?? "— bez kategorie"}
                  </td>
                  <td className="p-3 text-xs">
                    <div className="flex items-center gap-2">
                      {z.stav !== "prihlasen" && (
                        <Pill ton="error">{ZAV_STAV_LABEL[z.stav]}</Pill>
                      )}
                      {z.stav === "prihlasen" ? (
                        <>
                          <StavZav zavodnikId={z.id} akceId={id} stav="nenastoupil_DNS" label="DNS" />
                          <StavZav zavodnikId={z.id} akceId={id} stav="diskvalifikovan_DSQ" label="DSQ" />
                        </>
                      ) : (
                        <StavZav zavodnikId={z.id} akceId={id} stav="prihlasen" label="zrušit" />
                      )}
                      <ZavodnikFormDialog
                        akceId={id}
                        zavodnik={z}
                        triggerLabel="upravit"
                        triggerKind="link"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      </div>
    </SpravaShell>
  );
}

function PohlaviBtn({
  zavodnikId,
  akceId,
  pohlavi,
  aktivni,
}: {
  zavodnikId: string;
  akceId: string;
  pohlavi: "M" | "Z";
  aktivni: boolean;
}) {
  return (
    <form action={nastavitPohlavi.bind(null, zavodnikId, akceId, pohlavi)}>
      <button
        className={`text-[11px] transition-colors ${
          aktivni
            ? "font-bold text-teal-700"
            : "text-ink-400 hover:text-teal-700"
        }`}
      >
        {POHLAVI_LABEL[pohlavi]}
      </button>
    </form>
  );
}

function StavZav({
  zavodnikId,
  akceId,
  stav,
  label,
}: {
  zavodnikId: string;
  akceId: string;
  stav: "prihlasen" | "nenastoupil_DNS" | "diskvalifikovan_DSQ";
  label: string;
}) {
  return (
    <form action={nastavitStavZavodnika.bind(null, zavodnikId, akceId, stav)}>
      <button className="text-ink-500 underline transition-colors hover:text-teal-700">
        {label}
      </button>
    </form>
  );
}
