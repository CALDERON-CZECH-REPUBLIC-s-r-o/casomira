import Link from "next/link";
import { LineChart } from "lucide-react";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { cistyCas } from "@/lib/cas";
import {
  nactiVyvojCasu,
  type KategorieVyvoj,
  type VyvojBod,
} from "@/lib/vyvoj-casu";
import { Card, EmptyState, Pill } from "../_components/ui";

export const dynamic = "force-dynamic";

/** Mini SVG sparkline časů (rychlejší = výš). */
function Sparkline({ body }: { body: VyvojBod[] }) {
  if (body.length < 2) return null;
  const casy = body.map((b) => b.casMs);
  const min = Math.min(...casy);
  const rozsah = Math.max(...casy) - min || 1;
  const W = 100;
  const H = 32;
  const pad = 4;
  const pts = casy.map((v, i) => {
    const x = (i / (body.length - 1)) * (W - 2 * pad) + pad;
    const y = ((v - min) / rozsah) * (H - 2 * pad) + pad;
    return [x, y] as const;
  });
  const d = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="my-2 h-9 w-full"
      preserveAspectRatio="none"
    >
      <polyline
        points={d}
        fill="none"
        stroke="var(--teal-500)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} fill="var(--teal-500)" />
      ))}
      <circle cx={lx} cy={ly} r={2.6} fill="var(--teal-600)" />
    </svg>
  );
}

function TrendKarta({
  klic,
  nazev,
  body,
}: {
  klic: string;
  nazev: string;
  body: VyvojBod[];
}) {
  const nejlepsi = Math.min(...body.map((b) => b.casMs));
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-technical text-sm font-semibold text-teal-600">
            {klic}
          </span>
          <span className="truncate text-sm text-ink-600">{nazev}</span>
        </div>
        <span className="flex-none font-technical text-[11px] text-ink-400">
          {body.length} roč.
        </span>
      </div>

      <Sparkline body={body} />

      <div className="divide-y divide-ink-150">
        {body.map((b) => {
          const nej = b.casMs === nejlepsi;
          return (
            <Link
              key={b.akceId + b.rok}
              href={`/admin/akce/${b.akceId}/listiny`}
              className="flex items-center gap-2 py-1.5 transition-colors hover:bg-ink-50"
            >
              <span className="w-10 flex-none font-technical text-[12px] tabular-nums text-ink-400">
                {b.rok}
              </span>
              <span
                className={`w-20 flex-none font-technical text-sm tabular-nums ${
                  nej ? "font-bold text-teal-700" : "text-ink-900"
                }`}
              >
                {cistyCas(b.casMs)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink-600">
                {b.vitez}
              </span>
              {nej && body.length > 1 && (
                <Pill ton="teal" className="flex-none">
                  nejlepší
                </Pill>
              )}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function Sekce({ nadpis, data }: { nadpis: string; data: KategorieVyvoj[] }) {
  if (data.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="cal-eyebrow mb-3 text-teal-600">{nadpis}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((g) => (
          <TrendKarta key={g.klic} klic={g.klic} nazev={g.nazev} body={g.body} />
        ))}
      </div>
    </section>
  );
}

/** Srovnání ročníků — výběr let přes URL, tabulka vítězných časů po kategoriích. */
function Srovnani({
  vyvoj,
  vybrane,
}: {
  vyvoj: Awaited<ReturnType<typeof nactiVyvojCasu>>;
  vybrane: number[];
}) {
  if (vyvoj.roky.length < 2) return null;

  const hrefProRok = (rok: number) => {
    const set = new Set(vybrane);
    if (set.has(rok)) set.delete(rok);
    else set.add(rok);
    const list = [...set].sort((a, b) => a - b);
    return list.length ? `/admin/vyvoj?roky=${list.join(",")}` : "/admin/vyvoj";
  };

  type Radek = { label: string; body: VyvojBod[] };
  const radky: Radek[] = [
    { label: "Absolutně — muži", body: vyvoj.absolutneMuzi },
    { label: "Absolutně — ženy", body: vyvoj.absolutneZeny },
    ...[...vyvoj.muzi, ...vyvoj.zeny, ...vyvoj.smisene].map((g) => ({
      label: `${g.klic} · ${g.nazev}`,
      body: g.body,
    })),
  ].filter((r) => r.body.length > 0);

  const sloupce = [...vybrane].sort((a, b) => a - b);

  return (
    <section className="mb-10">
      <h2 className="cal-eyebrow mb-3 text-teal-600">Srovnání ročníků</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {vyvoj.roky.map((rok) => {
          const aktivni = vybrane.includes(rok);
          return (
            <Link
              key={rok}
              href={hrefProRok(rok)}
              className={`rounded-full px-3 py-1 font-technical text-[12px] tabular-nums transition-colors ${
                aktivni
                  ? "bg-teal-500 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              {rok}
            </Link>
          );
        })}
      </div>

      {sloupce.length < 2 ? (
        <p className="text-sm text-ink-500">
          Vyber alespoň dva ročníky ke srovnání.
        </p>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-150 text-left text-[12px] uppercase text-ink-500">
              <tr>
                <th className="p-3">Kategorie</th>
                {sloupce.map((r) => (
                  <th key={r} className="p-3 text-right font-technical tabular-nums">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-150">
              {radky.map((radek) => {
                const cellHodnoty = sloupce.map(
                  (rok) => radek.body.find((b) => b.rok === rok) ?? null,
                );
                const casy = cellHodnoty
                  .filter((c): c is VyvojBod => c !== null)
                  .map((c) => c.casMs);
                const nej = casy.length ? Math.min(...casy) : null;
                return (
                  <tr key={radek.label} className="hover:bg-ink-50">
                    <td className="p-3 text-ink-800">{radek.label}</td>
                    {cellHodnoty.map((c, i) => (
                      <td
                        key={i}
                        className="p-3 text-right font-technical tabular-nums"
                      >
                        {c ? (
                          <span
                            className={
                              nej !== null && c.casMs === nej
                                ? "font-bold text-teal-700"
                                : "text-ink-900"
                            }
                            title={c.vitez}
                          >
                            {cistyCas(c.casMs)}
                          </span>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}

export default async function VyvojPage({
  searchParams,
}: {
  searchParams: Promise<{ roky?: string }>;
}) {
  await vyzadujPrihlaseni();
  const sp = await searchParams;
  const vyvoj = await nactiVyvojCasu();

  const vybrane = (sp.roky ?? "")
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && vyvoj.roky.includes(n));

  const prazdno =
    vyvoj.muzi.length +
      vyvoj.zeny.length +
      vyvoj.smisene.length +
      vyvoj.absolutneMuzi.length +
      vyvoj.absolutneZeny.length ===
    0;

  const maAbs =
    vyvoj.absolutneMuzi.length > 0 || vyvoj.absolutneZeny.length > 0;

  return (
    <main className="min-h-screen bg-ink-50">
      <div className="cal-dots border-b border-ink-200 bg-[rgba(248,250,249,.92)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 p-6">
          <div>
            <div className="cal-eyebrow mb-1 text-teal-600">Statistiky</div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
              Vývoj časů vítězů
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Absolutní i kategoriální vítězné časy napříč ročníky
              {vyvoj.pocetAkci > 0 ? ` · ${vyvoj.pocetAkci} akcí` : ""}.
            </p>
          </div>
          <Link
            href="/admin"
            className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-500 transition-colors hover:text-ink-800"
          >
            ← Administrace
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl p-6">
        {prazdno ? (
          <EmptyState
            icon={<LineChart size={28} strokeWidth={1.75} />}
            title="Zatím žádné výsledky"
            desc="Naimportuj historické výsledky z PDF nebo naměř akci — vítězné časy se sem začnou skládat po ročnících."
          />
        ) : (
          <>
            {maAbs && (
              <section className="mb-10">
                <h2 className="cal-eyebrow mb-3 text-teal-600">
                  Absolutní vítězové
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {vyvoj.absolutneMuzi.length > 0 && (
                    <TrendKarta
                      klic="Abs"
                      nazev="Muži"
                      body={vyvoj.absolutneMuzi}
                    />
                  )}
                  {vyvoj.absolutneZeny.length > 0 && (
                    <TrendKarta
                      klic="Abs"
                      nazev="Ženy"
                      body={vyvoj.absolutneZeny}
                    />
                  )}
                </div>
              </section>
            )}

            <Srovnani vyvoj={vyvoj} vybrane={vybrane} />

            <Sekce nadpis="Muži — kategorie" data={vyvoj.muzi} />
            <Sekce nadpis="Ženy — kategorie" data={vyvoj.zeny} />
            <Sekce nadpis="Smíšené" data={vyvoj.smisene} />
          </>
        )}
      </div>
    </main>
  );
}
