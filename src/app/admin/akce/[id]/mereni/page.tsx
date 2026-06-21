import Link from "next/link";
import { vyzadujPrihlaseni } from "@/auth/guard";

export default async function MereniPage({
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
      <h1 className="mb-4 mt-2 text-2xl font-semibold">Měření — cílová obrazovka</h1>
      <p className="text-sm text-gray-500">
        Měřicí obrazovka (offline-first, velké tlačítko, fronta „K doplnění“,
        Wake Lock) — připravuje se (milník M4).
      </p>
    </main>
  );
}
