import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { BtnLink, PageHeader } from "../../../_components/ui";
import { SpravaShell } from "@/app/admin/_components/sprava-shell";
import { ImportWizard } from "./import-wizard";

export const dynamic = "force-dynamic";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;
  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-4xl p-8">
        <PageHeader
          eyebrow="Import"
          title="Import z Excelu"
          desc={
            <>
              Podporuje <code>.xlsx</code> i starší <code>.xls</code>.
              Referenční rok akce pro výpočet věku: <strong>{akce.rok}</strong>.
            </>
          }
        />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-ink-200 bg-ink-50 p-4">
          <p className="text-sm text-ink-600">
            Máš hotovou <strong className="text-ink-900">výsledkovou listinu v PDF</strong>{" "}
            (s časy)? Naimportuj rovnou výsledky včetně časů.
          </p>
          <BtnLink
            href={`/admin/akce/${id}/import-vysledky`}
            variant="ghost"
            className="flex-none"
          >
            Import historických výsledků z PDF →
          </BtnLink>
        </div>
        <ImportWizard akceId={id} akceRok={akce.rok} />
      </div>
    </SpravaShell>
  );
}
