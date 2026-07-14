import { notFound } from "next/navigation";
import { vyzadujAkci } from "@/auth/guard";
import { nactiDataAkce } from "@/lib/listiny-data";
import { startovniRadky } from "@/domain/vysledky";
import { TiskToolbar } from "../_components/tisk-toolbar";
import {
  ListinaHlavicka,
  StartovniTabulka,
  SekceHlavicka,
  TiskStyl,
} from "../_components/listina-ui";

export const dynamic = "force-dynamic";

export default async function StartovniListinaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rozsah?: string; sort?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await vyzadujAkci(id);
  const rozsah = sp.rozsah === "kategorie" ? "kategorie" : "celkova";
  const sort = sp.sort === "abeceda" ? "abeceda" : "cislo";

  const data = await nactiDataAkce(id);
  if (!data) notFound();

  const kategorieKod = new Map(
    data.kategorie.map((k) => [k.id, k.kod ?? k.nazev]),
  );
  const kategorieSerazene = [...data.kategorie].sort(
    (a, b) => a.poradi - b.poradi,
  );

  return (
    <main className="mx-auto max-w-4xl p-6 print:max-w-none print:p-0">
      <TiskStyl />
      <TiskToolbar
        zpetHref={`/admin/akce/${id}/listiny`}
        titulek="Listiny"
      />

      <div className="cal-card p-8 shadow-[var(--shadow-sm)] print:border-0 print:p-0 print:shadow-none">
      <ListinaHlavicka
        nazev={data.akce.nazev}
        datum={data.akce.datum}
        misto={data.akce.misto}
        typ="Startovní listina"
        podtitul={`${data.zavodnici.length} přihlášených · řazeno ${sort === "abeceda" ? "abecedně" : "dle čísla"}`}
      />

      {rozsah === "celkova" ? (
        <StartovniTabulka
          zavodnici={startovniRadky(data.zavodnici, sort)}
          kategorieKod={kategorieKod}
        />
      ) : (
        <>
          {kategorieSerazene.map((kat) => {
            const vKat = data.zavodnici.filter((z) => z.kategorieId === kat.id);
            if (vKat.length === 0) return null;
            return (
              <section key={kat.id}>
                <SekceHlavicka kategorie={kat} />
                <StartovniTabulka zavodnici={startovniRadky(vKat, sort)} />
              </section>
            );
          })}
          {(() => {
            const bezKat = data.zavodnici.filter((z) => z.kategorieId === null);
            if (bezKat.length === 0) return null;
            return (
              <section>
                <h3 className="mb-1.5 mt-6 border-b border-ink-200 pb-1 text-base font-semibold text-warning">
                  Bez kategorie ({bezKat.length})
                </h3>
                <StartovniTabulka zavodnici={startovniRadky(bezKat, sort)} />
              </section>
            );
          })()}
        </>
      )}
      </div>
    </main>
  );
}
