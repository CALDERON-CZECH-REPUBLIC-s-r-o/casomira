import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT, zavodnik as zavT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { vekVRoce } from "@/domain/zarazeni";
import { nastavitStavZavodnika } from "@/server/opravy";
import { BtnLink, Card, PageHeader } from "../../../_components/ui";

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
    <main className="mx-auto max-w-4xl p-6">
      <PageHeader
        back={{ href: `/admin/akce/${id}`, label: akce.nazev }}
        eyebrow="Závodníci"
        title="Závodníci"
        desc={
          <span className="font-technical tabular-nums">
            {zavodnici.length} přihlášených
          </span>
        }
        actions={
          <BtnLink href={`/admin/akce/${id}/import`}>+ Import z Excelu</BtnLink>
        }
      />

      {(bezKategorie > 0 || bezPohlavi > 0) && (
        <p className="mb-4 rounded-[10px] bg-warning-bg p-3 text-sm text-warning">
          K řešení:{" "}
          {bezPohlavi > 0 && <>{bezPohlavi} bez pohlaví; </>}
          {bezKategorie > 0 && <>{bezKategorie} bez kategorie </>}
          (doplň pohlaví / uprav kategorie a spusť přepočet).
        </p>
      )}

      {zavodnici.length === 0 ? (
        <p className="text-sm text-ink-500">
          Zatím žádní závodníci. Naimportuj přihlášky z Excelu.
        </p>
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
                    {z.prijmeni} {z.jmeno}
                  </td>
                  <td className="p-3 font-technical tabular-nums text-ink-700">
                    {z.rokNarozeni ?? "—"}
                    {z.rokNarozeni
                      ? ` (${vekVRoce(akce.rok, z.rokNarozeni)} let)`
                      : ""}
                  </td>
                  <td className={`p-3 ${z.pohlavi ? "text-ink-700" : "text-error"}`}>
                    {z.pohlavi ? POHLAVI_LABEL[z.pohlavi] : "?"}
                  </td>
                  <td className="p-3 text-ink-700">{z.oddil ?? z.mesto ?? "—"}</td>
                  <td className={`p-3 ${z.kategorie ? "text-ink-700" : "text-amber-500"}`}>
                    {z.kategorie?.kod ?? z.kategorie?.nazev ?? "— bez kategorie"}
                  </td>
                  <td className="p-3 text-xs">
                    <div className="flex items-center gap-2">
                      {z.stav !== "prihlasen" && (
                        <span className="rounded-full bg-error-bg px-2 py-0.5 text-[11px] font-technical text-error">
                          {ZAV_STAV_LABEL[z.stav]}
                        </span>
                      )}
                      {z.stav === "prihlasen" ? (
                        <>
                          <StavZav zavodnikId={z.id} akceId={id} stav="nenastoupil_DNS" label="DNS" />
                          <StavZav zavodnikId={z.id} akceId={id} stav="diskvalifikovan_DSQ" label="DSQ" />
                        </>
                      ) : (
                        <StavZav zavodnikId={z.id} akceId={id} stav="prihlasen" label="zrušit" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
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
