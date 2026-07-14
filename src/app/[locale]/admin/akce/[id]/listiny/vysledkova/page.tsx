import { notFound } from "next/navigation";
import { vyzadujAkci } from "@/auth/guard";
import { nactiDataAkce } from "@/lib/listiny-data";
import { serazeneVysledky } from "@/domain/vysledky";
import { TiskToolbar } from "../_components/tisk-toolbar";
import {
  ListinaHlavicka,
  VysledkovaTabulka,
  SekceHlavicka,
  TiskStyl,
} from "../_components/listina-ui";

export const dynamic = "force-dynamic";

export default async function VysledkovaListinaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rozsah?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await vyzadujAkci(id);
  const rozsah = sp.rozsah === "celkova" ? "celkova" : "kategorie";

  const data = await nactiDataAkce(id);
  if (!data) notFound();

  const vysledky = serazeneVysledky(
    data.zavodnici,
    data.zaznamy,
    data.akce.casStartu,
    data.kategorie,
  );
  const kategorieKod = new Map(
    data.kategorie.map((k) => [k.id, k.kod ?? k.nazev]),
  );

  const bezStartu = data.akce.casStartu === null;

  return (
    <main className="mx-auto max-w-4xl p-6 print:max-w-none print:p-0">
      <TiskStyl />
      <TiskToolbar zpetHref={`/admin/akce/${id}/listiny`} titulek="Listiny" />

      <div className="cal-card p-8 shadow-[var(--shadow-sm)] print:border-0 print:p-0 print:shadow-none">
      <ListinaHlavicka
        nazev={data.akce.nazev}
        datum={data.akce.datum}
        misto={data.akce.misto}
        typ="Výsledková listina"
        podtitul={rozsah === "celkova" ? "celkové pořadí" : undefined}
      />

      {bezStartu && (
        <p className="mb-4 rounded-[10px] bg-warning-bg p-3 text-sm text-warning print:hidden">
          Akce nemá nastavený čas startu — čisté časy nelze spočítat. Nastav
          start na měřicí obrazovce.
        </p>
      )}

      {rozsah === "celkova" ? (
        <VysledkovaTabulka
          radky={vysledky.celkova.radky}
          kategorieKod={kategorieKod}
        />
      ) : (
        vysledky.kategorie.map((sk) =>
          sk.radky.length === 0 ? null : (
            <section key={sk.kategorie!.id}>
              <SekceHlavicka kategorie={sk.kategorie!} souhrn={sk} />
              <VysledkovaTabulka radky={sk.radky} />
            </section>
          ),
        )
      )}
      </div>
    </main>
  );
}
