import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  zavodnik as zavT,
  kategorie as katT,
  cilovyZaznam,
  mericiBod as bodT,
} from "@/db/schema";
import { vyzadujAkci } from "@/auth/guard";
import {
  serazeneVysledky,
  type ZavodnikVysledek,
  type ZaznamVysledek,
  type KategorieVysledek,
} from "@/domain/vysledky";
import {
  spocitejSplity,
  formatTempo,
  type SplitZaznam,
  type MericiBodDomain,
} from "@/domain/splity";
import { cistyCas } from "@/lib/cas";
import { nactiHistoriiZavodnika } from "@/lib/historie";
import { SpravaShell } from "@/app/[locale]/admin/_components/sprava-shell";
import {
  BackLink,
  Card,
  MetricCard,
  Pill,
} from "@/app/[locale]/admin/_components/ui";

export const dynamic = "force-dynamic";

function ms(d: Date | string | null): number | null {
  return d === null ? null : new Date(d).getTime();
}

const STAV_META: Record<
  string,
  { label: string; ton: "success" | "warning" | "error" | "ink" }
> = {
  klasifikovan: { label: "V cíli", ton: "success" },
  DNF: { label: "DNF", ton: "warning" },
  DNS: { label: "DNS", ton: "ink" },
  DSQ: { label: "DSQ", ton: "error" },
};

export default async function ZavodnikDetailPage({
  params,
}: {
  params: Promise<{ id: string; cislo: string }>;
}) {
  const { id, cislo } = await params;

  const { akce } = await vyzadujAkci(id);

  const cisloNum = Number.parseInt(cislo, 10);
  if (!Number.isFinite(cisloNum)) notFound();

  const zavodnik = await db.query.zavodnik.findFirst({
    where: and(eq(zavT.akceId, id), eq(zavT.startovniCislo, cisloNum)),
    with: { kategorie: true },
  });
  if (!zavodnik) notFound();

  const historie = await nactiHistoriiZavodnika({
    prijmeni: zavodnik.prijmeni,
    jmeno: zavodnik.jmeno,
    rokNarozeni: zavodnik.rokNarozeni,
  });

  const [zavodniciDb, kategorieDb, zaznamyDb, bodyDb] = await Promise.all([
    db.query.zavodnik.findMany({ where: eq(zavT.akceId, id) }),
    db.query.kategorie.findMany({ where: eq(katT.akceId, id) }),
    db.query.cilovyZaznam.findMany({
      where: eq(cilovyZaznam.akceId, id),
      columns: { zavodnikId: true, casCile: true, stav: true, bodId: true },
    }),
    db.query.mericiBod.findMany({
      where: eq(bodT.akceId, id),
      orderBy: (b, { asc }) => [asc(b.poradi)],
    }),
  ]);

  // --- Domain mapping ---
  const zavodniciMapped: ZavodnikVysledek[] = zavodniciDb.map((z) => ({
    id: z.id,
    jmeno: z.jmeno,
    prijmeni: z.prijmeni,
    rokNarozeni: z.rokNarozeni,
    startovniCislo: z.startovniCislo,
    oddil: z.oddil,
    mesto: z.mesto,
    kategorieId: z.kategorieId,
    stav: z.stav,
  }));

  const kategorieMapped: KategorieVysledek[] = kategorieDb.map((k) => ({
    id: k.id,
    nazev: k.nazev,
    kod: k.kod,
    poradi: k.poradi,
    casStartu: k.casStartu,
  }));

  const zaznamyMapped: ZaznamVysledek[] = zaznamyDb.map((r) => ({
    zavodnikId: r.zavodnikId,
    casCile: r.casCile,
    stav: r.stav,
    bodId: r.bodId,
  }));

  const bodyDomain: MericiBodDomain[] = bodyDb.map((b) => ({
    id: b.id,
    nazev: b.nazev,
    poradi: b.poradi,
    vzdalenostM: b.vzdalenostM,
    jeCil: b.jeCil,
  }));

  // --- Výsledky ---
  const vysledky = serazeneVysledky(
    zavodniciMapped,
    zaznamyMapped,
    akce.casStartu,
    kategorieMapped,
    bodyDomain.map((b) => ({ id: b.id, jeCil: b.jeCil })),
  );

  const skupina = zavodnik.kategorieId
    ? vysledky.kategorie.find((s) => s.kategorie?.id === zavodnik.kategorieId)
    : undefined;
  const mojeRadek =
    skupina?.radky.find((r) => r.zavodnik.id === zavodnik.id) ??
    vysledky.celkova.radky.find((r) => r.zavodnik.id === zavodnik.id);

  const poradiVKat = mojeRadek?.poradi ?? null;
  const klasifKat = skupina?.klasifikovano ?? null;
  const cistyCasMs = mojeRadek?.cistyCasMs ?? null;
  const stav = mojeRadek?.stav ?? "bez_casu";

  const absRadek = vysledky.celkova.radky.find(
    (r) => r.zavodnik.id === zavodnik.id,
  );
  const absPoradi = absRadek?.poradi ?? null;
  const absKlasif = vysledky.celkova.klasifikovano;

  // --- Splity ---
  const splitMapa = new Map<string, SplitZaznam[]>();
  for (const r of zaznamyMapped) {
    if (!r.zavodnikId) continue;
    const arr = splitMapa.get(r.zavodnikId) ?? [];
    arr.push({ bodId: r.bodId ?? null, casCile: r.casCile, stav: r.stav });
    splitMapa.set(r.zavodnikId, arr);
  }

  const katStartMap = new Map(kategorieDb.map((k) => [k.id, k.casStartu]));
  const zavKatMap = new Map(zavodniciDb.map((z) => [z.id, z.kategorieId]));
  const akceStartMs = ms(akce.casStartu);
  const startMsProZavodnika = (zid: string): number | null => {
    const katId = zavKatMap.get(zid) ?? null;
    const katStart = katId ? katStartMap.get(katId) ?? null : null;
    return katStart !== null ? ms(katStart) : akceStartMs;
  };

  const vsechnySplity = spocitejSplity(
    zavodniciMapped.map((z) => ({ id: z.id })),
    splitMapa,
    bodyDomain,
    startMsProZavodnika,
  );
  const mojeSplity = vsechnySplity.get(zavodnik.id) ?? [];

  // --- Průměrné tempo ---
  const maxVzd = bodyDomain.reduce<number | null>(
    (max, b) => (b.vzdalenostM !== null && b.vzdalenostM > (max ?? 0) ? b.vzdalenostM : max),
    null,
  );
  const distM = maxVzd ?? akce.delkaM ?? null;
  const tempoSecNaKm =
    cistyCasMs !== null && distM && distM > 0
      ? cistyCasMs / distM // (cistyCasMs/1000) / (distM/1000)
      : null;

  const stavMeta =
    stav === "bez_casu"
      ? { label: "na trati", ton: "ink" as const }
      : STAV_META[stav] ?? { label: stav, ton: "ink" as const };

  const kategorieLabel =
    zavodnik.kategorie?.kod ?? zavodnik.kategorie?.nazev ?? "bez kategorie";
  const oddilLabel = zavodnik.oddil ?? zavodnik.mesto ?? "—";

  return (
    <SpravaShell akceId={id} nazev={akce.nazev}>
      <div className="mx-auto max-w-3xl p-8">
        <div className="mb-3">
          <BackLink href={`/admin/akce/${id}/zavodnici`}>Závodníci</BackLink>
        </div>

        <header className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">
              {zavodnik.jmeno} {zavodnik.prijmeni}
            </h1>
            <div className="mt-1.5 text-sm text-ink-500">
              č.{cisloNum} · {kategorieLabel} · {oddilLabel}
            </div>
          </div>
          <Pill ton={stavMeta.ton}>{stavMeta.label}</Pill>
        </header>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label="Čistý čas"
            value={cistyCasMs !== null ? cistyCas(cistyCasMs) : "—"}
          />
          <MetricCard
            label="Pořadí v kat."
            value={`${poradiVKat ?? "—"}/${klasifKat ?? "—"}`}
          />
          <MetricCard
            label="Absolutně"
            value={`${absPoradi ?? "—"}/${absKlasif}`}
          />
          <MetricCard
            label="Prům. tempo"
            value={tempoSecNaKm !== null ? formatTempo(tempoSecNaKm) : "—"}
          />
        </div>

        {bodyDomain.length === 0 ? (
          <p className="text-sm text-ink-400">
            Akce nemá měřicí body — jen cílové měření.
          </p>
        ) : (
          <Card className="overflow-hidden">
            <div className="cal-eyebrow border-b border-ink-200 px-5 py-3 text-teal-600">
              Mezičasy na trati
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="cal-eyebrow border-b border-ink-150 text-left text-ink-400">
                  <th className="px-5 py-2 font-medium">Měřicí bod</th>
                  <th className="px-5 py-2 text-right font-medium">Kumulativně</th>
                  <th className="px-5 py-2 text-right font-medium">Úsek</th>
                  <th className="px-5 py-2 text-right font-medium">Tempo</th>
                  <th className="px-5 py-2 text-right font-medium">Pozice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-150">
                {mojeSplity.map((s) => (
                  <tr key={s.bod.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-ink-900">{s.bod.nazev}</div>
                      {s.bod.vzdalenostM !== null && (
                        <div className="font-technical text-[12px] tabular-nums text-ink-400">
                          {s.bod.vzdalenostM} m
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-technical tabular-nums text-ink-900">
                      {s.kumulativMs !== null ? cistyCas(s.kumulativMs) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-technical tabular-nums text-ink-700">
                      {s.usekMs !== null ? cistyCas(s.usekMs) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-technical tabular-nums text-ink-700">
                      {formatTempo(s.tempoSecNaKm)}
                    </td>
                    <td className="px-5 py-3 text-right font-technical tabular-nums text-ink-500">
                      {s.poziceVBode ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Historické výsledky (shoda dle jména + roku narození) */}
        {historie.length > 0 && (
          <Card className="mt-6 overflow-hidden">
            <div className="cal-eyebrow border-b border-ink-200 px-5 py-3 text-teal-600">
              Historické výsledky
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="cal-eyebrow border-b border-ink-150 text-left text-ink-400">
                  <th className="px-5 py-2 font-medium">Ročník</th>
                  <th className="px-5 py-2 font-medium">Akce</th>
                  <th className="px-5 py-2 font-medium">Kategorie</th>
                  <th className="px-5 py-2 text-right font-medium">Pořadí</th>
                  <th className="px-5 py-2 text-right font-medium">Čas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-150">
                {historie.map((h, i) => (
                  <tr key={`${h.rok}-${i}`}>
                    <td className="px-5 py-3 font-technical tabular-nums text-ink-900">
                      {h.rok}
                    </td>
                    <td className="px-5 py-3 text-ink-700">{h.akceNazev}</td>
                    <td className="px-5 py-3 text-ink-500">
                      {h.kategorie ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-technical tabular-nums text-ink-500">
                      {h.poradi ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-technical font-semibold tabular-nums text-ink-900">
                      {cistyCas(h.casMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </SpravaShell>
  );
}
