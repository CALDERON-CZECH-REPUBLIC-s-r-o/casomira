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
  const max = Math.max(...casy);
  const rozsah = max - min || 1;
  const W = 100;
  const H = 32;
  const pad = 4;
  const bod = (v: number, i: number) => {
    const x = (i / (body.length - 1)) * (W - 2 * pad) + pad;
    // rychlejší (menší čas) = výš (menší y)
    const y = ((v - min) / rozsah) * (H - 2 * pad) + pad;
    return [x, y] as const;
  };
  const pts = casy.map(bod);
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

function KategorieKarta({ g }: { g: KategorieVyvoj }) {
  const nejlepsi = Math.min(...g.body.map((b) => b.casMs));
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-technical text-sm font-semibold text-teal-600">
            {g.klic}
          </span>
          <span className="truncate text-sm text-ink-600">{g.nazev}</span>
        </div>
        <span className="flex-none font-technical text-[11px] text-ink-400">
          {g.body.length} roč.
        </span>
      </div>

      <Sparkline body={g.body} />

      <div className="divide-y divide-ink-150">
        {g.body.map((b) => {
          const nej = b.casMs === nejlepsi;
          return (
            <Link
              key={b.akceId}
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
              {nej && g.body.length > 1 && (
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
          <KategorieKarta key={g.klic} g={g} />
        ))}
      </div>
    </section>
  );
}

export default async function VyvojPage() {
  await vyzadujPrihlaseni();
  const vyvoj = await nactiVyvojCasu();
  const prazdno =
    vyvoj.muzi.length + vyvoj.zeny.length + vyvoj.smisene.length === 0;

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
              Vítězné časy mužů a žen podle kategorií napříč ročníky
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
            <Sekce nadpis="Muži" data={vyvoj.muzi} />
            <Sekce nadpis="Ženy" data={vyvoj.zeny} />
            <Sekce nadpis="Smíšené" data={vyvoj.smisene} />
          </>
        )}
      </div>
    </main>
  );
}
