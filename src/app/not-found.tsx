import Link from "next/link";

/** 404 — Calderon 15a: tmavý dot-grid, velké mono číslo v teal. */
export default function NotFound() {
  return (
    <main className="cal-dots-dark cal-glow-top flex flex-1 flex-col items-center justify-center bg-ink-950 p-6 text-center font-brand">
      <div className="font-technical text-[96px] font-bold leading-none tabular-nums text-teal-300">
        404
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">
        Tady nic není
      </h1>
      <p className="mt-2 max-w-sm text-sm text-ink-300">
        Stránka neexistuje nebo byla přesunuta. Zkontroluj adresu, nebo se vrať na
        přehled akcí.
      </p>
      <div className="mt-7 flex items-center gap-3">
        <Link
          href="/admin"
          className="cal-press rounded-[10px] bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-colors hover:bg-teal-600"
        >
          Přehled akcí
        </Link>
        <Link
          href="/"
          className="cal-press rounded-[10px] border border-white/15 px-4 py-2 text-sm font-semibold text-ink-200 transition-colors hover:bg-white/5"
        >
          Domů
        </Link>
      </div>
    </main>
  );
}
