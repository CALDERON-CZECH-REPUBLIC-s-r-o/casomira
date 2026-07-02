import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT, kategorie as katT, zavodnik as zavT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { upravitAkci, smazatAkci } from "@/server/akce";
import { AkceFormFields } from "../../_components/akce-form";
import { Btn, Card, PageHeader } from "../../_components/ui";

export const dynamic = "force-dynamic";

export default async function AkceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const kategorie = await db.$count(katT, eq(katT.akceId, id));
  const zavodnici = await db.$count(zavT, eq(zavT.akceId, id));
  const bezKategorie = await db.$count(
    zavT,
    and(eq(zavT.akceId, id), isNull(zavT.kategorieId)),
  );

  return (
    <main className="mx-auto max-w-3xl p-6">
      <PageHeader
        back={{ href: "/admin", label: "Administrace" }}
        eyebrow="Akce"
        title={akce.nazev}
        desc={
          <>
            Veřejná URL:{" "}
            <Link
              href={`/${akce.slug}`}
              target="_blank"
              className="font-medium text-teal-600 hover:text-teal-700"
            >
              /{akce.slug} ↗
            </Link>
          </>
        }
      />

      <nav className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SekceKarta
          href={`/admin/akce/${id}/mereni`}
          titul="Měření"
          popis="cílová obrazovka"
          zvyraznit
        />
        <SekceKarta
          href={`/admin/akce/${id}/kategorie`}
          titul="Kategorie"
          popis={`${kategorie} kategorií`}
        />
        <SekceKarta
          href={`/admin/akce/${id}/zavodnici`}
          titul="Závodníci"
          popis={`${zavodnici} závodníků${bezKategorie ? ` · ${bezKategorie} bez kategorie` : ""}`}
        />
        <SekceKarta
          href={`/admin/akce/${id}/import`}
          titul="Import z Excelu"
          popis="přihlášky .xls/.xlsx"
        />
        <SekceKarta
          href={`/admin/akce/${id}/listiny`}
          titul="Listiny"
          popis="startovní · výsledková · PDF/XLSX"
        />
        <SekceKarta
          href={`/admin/akce/${id}/opravy`}
          titul="Opravy"
          popis="editace průchodů · historie"
        />
        <SekceKarta
          href={`/admin/akce/${id}/publikovat`}
          titul="Publikování"
          popis="push na cloud · záloha JSON"
        />
      </nav>

      <section className="mb-8">
        <div className="cal-eyebrow mb-3">Úprava akce</div>
        <Card className="p-5">
          <form action={upravitAkci.bind(null, id)} className="flex flex-col gap-6">
            <AkceFormFields akce={akce} />
            <Btn type="submit" className="self-start">
              Uložit změny
            </Btn>
          </form>
        </Card>
      </section>

      <section className="border-t border-ink-200 pt-6">
        <form action={smazatAkci.bind(null, id)}>
          <button className="text-sm font-medium text-error hover:underline">
            Smazat akci (včetně kategorií, závodníků a záznamů)
          </button>
        </form>
      </section>
    </main>
  );
}

function SekceKarta({
  href,
  titul,
  popis,
  zvyraznit = false,
}: {
  href: string;
  titul: string;
  popis: string;
  zvyraznit?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group cal-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${
        zvyraznit ? "border-teal-200 bg-teal-50" : ""
      }`}
    >
      <div
        className={`font-semibold ${zvyraznit ? "text-teal-700" : "text-ink-900 group-hover:text-teal-700"}`}
      >
        {titul}
      </div>
      <div className="mt-0.5 text-[13px] text-ink-500">{popis}</div>
    </Link>
  );
}
