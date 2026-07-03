import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { PageHeader } from "../../../_components/ui";
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
        <ImportWizard akceId={id} akceRok={akce.rok} />
      </div>
    </SpravaShell>
  );
}
