import Link from "next/link";
import { vyzadujPrihlaseni } from "@/auth/guard";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link
        href={`/admin/akce/${id}`}
        className="text-sm text-gray-500 hover:underline"
      >
        ← zpět na akci
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-semibold">Import z Excelu</h1>
      <p className="text-sm text-gray-500">
        Import přihlášek z <code>.xls</code>/<code>.xlsx</code> s mapováním
        sloupců a doplněním pohlaví — připravuje se (milník M3).
      </p>
    </main>
  );
}
