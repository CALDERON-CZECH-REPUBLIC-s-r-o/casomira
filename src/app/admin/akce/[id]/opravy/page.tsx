import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  akce as akceT,
  cilovyZaznam,
  upravaLog,
} from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { casNaInput, casDneKratky } from "@/lib/cas";
import {
  vlozitRucniPruchod,
  upravitCasZaznamu,
  upravitCisloZaznamu,
  zmenitStavZaznamu,
} from "@/server/opravy";

export const dynamic = "force-dynamic";

const STAV_LABEL: Record<string, string> = {
  platny: "platný",
  neprirazeno: "k doplnění",
  smazany: "smazaný",
  DNF: "DNF",
};

export default async function OpravyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chyba?: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;
  const sp = await searchParams;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const zaznamy = await db.query.cilovyZaznam.findMany({
    where: eq(cilovyZaznam.akceId, id),
    orderBy: (z, { desc }) => [desc(z.poradiDoteku)],
    with: { zavodnik: true },
  });

  const log = await db.query.upravaLog.findMany({
    where: eq(upravaLog.akceId, id),
    orderBy: [desc(upravaLog.kdy)],
    limit: 40,
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link
        href={`/admin/akce/${id}`}
        className="text-sm text-gray-500 hover:underline"
      >
        ← {akce.nazev}
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">Opravy průchodů</h1>
      <p className="mb-6 text-sm text-gray-500">
        Ruční úprava času (oprava překlepu), doplnění čísla, vložení vynechaného
        průchodu, DNF a mazání. Razítko měň jen při opravě překlepu.
      </p>

      {sp.chyba && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {sp.chyba}
        </p>
      )}

      {/* Ruční vložení */}
      <section className="mb-6 rounded-lg border border-dashed p-4">
        <h2 className="mb-3 text-sm font-medium">
          Vložit vynechaný průchod
        </h2>
        <form
          action={vlozitRucniPruchod.bind(null, id)}
          className="flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="datum" value={akce.datum} />
          <label className="flex flex-col gap-1 text-sm">
            Čas (HH:mm:ss.SSS)
            <input
              name="cas"
              required
              placeholder="14:03:27.480"
              className="w-40 rounded-md border border-gray-300 px-2 py-1.5 tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Číslo (volitelně)
            <input
              name="cislo"
              inputMode="numeric"
              className="w-24 rounded-md border border-gray-300 px-2 py-1.5 tabular-nums"
            />
          </label>
          <button className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
            Vložit
          </button>
        </form>
      </section>

      {/* Tabulka průchodů */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">
          Průchody ({zaznamy.length})
        </h2>
        {zaznamy.length === 0 ? (
          <p className="text-sm text-gray-500">Zatím žádné průchody.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-gray-500">
              <tr>
                <th className="py-2">#</th>
                <th>Čas (editovatelný)</th>
                <th>Číslo</th>
                <th>Jméno</th>
                <th>Stav</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {zaznamy.map((z) => {
                const smazany = z.stav === "smazany";
                return (
                  <tr
                    key={z.id}
                    className={`border-b last:border-0 ${smazany ? "text-gray-400 line-through" : ""}`}
                  >
                    <td className="py-1.5 tabular-nums text-gray-400">
                      {z.poradiDoteku}
                    </td>
                    <td>
                      <form
                        action={upravitCasZaznamu.bind(null, z.id, id)}
                        className="flex items-center gap-1"
                      >
                        <input
                          name="cas"
                          defaultValue={casNaInput(z.casCile)}
                          className="w-32 rounded border border-gray-200 px-1.5 py-0.5 tabular-nums"
                        />
                        <button className="text-xs text-blue-600 underline">
                          ulož
                        </button>
                      </form>
                    </td>
                    <td>
                      <form
                        action={upravitCisloZaznamu.bind(null, z.id, id)}
                        className="flex items-center gap-1"
                      >
                        <input
                          name="cislo"
                          defaultValue={z.startovniCislo ?? ""}
                          inputMode="numeric"
                          className="w-16 rounded border border-gray-200 px-1.5 py-0.5 tabular-nums"
                        />
                        <button className="text-xs text-blue-600 underline">
                          ulož
                        </button>
                      </form>
                    </td>
                    <td>
                      {z.zavodnik
                        ? `${z.zavodnik.prijmeni} ${z.zavodnik.jmeno}`
                        : z.startovniCislo === null
                          ? "—"
                          : "neznámé číslo"}
                    </td>
                    <td className="text-xs">{STAV_LABEL[z.stav] ?? z.stav}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        {z.stav !== "DNF" ? (
                          <StavButton
                            zaznamId={z.id}
                            akceId={id}
                            stav="DNF"
                            label="DNF"
                          />
                        ) : (
                          <StavButton
                            zaznamId={z.id}
                            akceId={id}
                            stav={z.startovniCislo !== null ? "platny" : "neprirazeno"}
                            label="zrušit DNF"
                          />
                        )}
                        {smazany ? (
                          <StavButton
                            zaznamId={z.id}
                            akceId={id}
                            stav={z.startovniCislo !== null ? "platny" : "neprirazeno"}
                            label="obnovit"
                          />
                        ) : (
                          <StavButton
                            zaznamId={z.id}
                            akceId={id}
                            stav="smazany"
                            label="smazat"
                            cervena
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Historie změn */}
      <section>
        <h2 className="mb-3 text-lg font-medium">Historie změn</h2>
        {log.length === 0 ? (
          <p className="text-sm text-gray-500">Zatím žádné úpravy.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {log.map((l) => (
              <li key={l.id} className="flex gap-3">
                <span className="shrink-0 tabular-nums text-gray-400">
                  {casDneKratky(l.kdy)}
                </span>
                <span>{l.popis}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StavButton({
  zaznamId,
  akceId,
  stav,
  label,
  cervena,
}: {
  zaznamId: string;
  akceId: string;
  stav: "platny" | "neprirazeno" | "smazany" | "DNF";
  label: string;
  cervena?: boolean;
}) {
  return (
    <form action={zmenitStavZaznamu.bind(null, zaznamId, akceId, stav)}>
      <button className={`underline ${cervena ? "text-red-600" : "text-gray-500"}`}>
        {label}
      </button>
    </form>
  );
}
