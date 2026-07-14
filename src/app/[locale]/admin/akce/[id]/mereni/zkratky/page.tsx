import Link from "next/link";
import { vyzadujAkci } from "@/auth/guard";

export const dynamic = "force-dynamic";

/** 9a — Ovládání měřicí obrazovky (klávesy + interakce). Dark, dle měření. */
const ZKRATKY: { klavesa: string; popis: string }[] = [
  { klavesa: "Mezerník", popis: "Zaznamenat průchod (režim velkého tlačítka)" },
  { klavesa: "Klik / ťuk", popis: "Dlaždice čísla v číselníku = zaznamenat průchod" },
  { klavesa: "Enter", popis: "V poli „č.“ přiřadit číslo z fronty k doplnění" },
  { klavesa: "Enter", popis: "V předvyplnění potvrdit a rovnou zaznamenat" },
];

export default async function ZkratkyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await vyzadujAkci(id);
  return (
    <main className="cal-dots-dark flex flex-1 flex-col items-center bg-ink-950 px-6 py-12 font-brand text-white">
      <div className="w-full max-w-lg">
        <div className="cal-eyebrow mb-1 text-teal-300">Měření</div>
        <h1 className="font-display text-2xl font-bold">Ovládání a zkratky</h1>
        <p className="mt-2 text-sm text-ink-300">
          Rychlé odbavování v cíli. Razítko se ukládá v okamžiku stisku a je
          neměnné.
        </p>

        <div className="mt-6 divide-y divide-white/10 rounded-[16px] border border-white/10 bg-white/[.03]">
          {ZKRATKY.map((z, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <kbd className="flex-none rounded-[8px] border border-white/15 bg-white/5 px-2.5 py-1 font-technical text-[12px] text-teal-300">
                {z.klavesa}
              </kbd>
              <span className="text-[13.5px] text-ink-200">{z.popis}</span>
            </div>
          ))}
        </div>

        <Link
          href={`/admin/akce/${id}/mereni`}
          className="mt-8 inline-flex rounded-[10px] bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
        >
          ← Zpět na měření
        </Link>
      </div>
    </main>
  );
}
