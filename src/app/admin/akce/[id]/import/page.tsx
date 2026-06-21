import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
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
    <main className="mx-auto max-w-5xl p-6">
      <Link
        href={`/admin/akce/${id}`}
        className="text-sm text-gray-500 hover:underline"
      >
        ← {akce.nazev}
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">Import přihlášek z Excelu</h1>
      <p className="mb-6 text-sm text-gray-500">
        Podporuje <code>.xlsx</code> i starší <code>.xls</code>. Referenční rok
        akce pro výpočet věku: <strong>{akce.rok}</strong>.
      </p>
      <ImportWizard akceId={id} akceRok={akce.rok} />
    </main>
  );
}
