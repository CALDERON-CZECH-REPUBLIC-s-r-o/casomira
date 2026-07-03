"use client";

import Link from "next/link";
import { PoweredBy } from "@/app/admin/_components/ui";

/** 500 — Calderon 15b: číslo v amber, ujištění že naměřená data jsou v bezpečí. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="cal-dots-dark flex flex-1 flex-col items-center justify-center bg-ink-950 p-6 text-center font-brand">
      <div className="font-technical text-[96px] font-bold leading-none tabular-nums text-amber-500">
        500
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">
        Něco se pokazilo
      </h1>
      <p className="mt-2 max-w-sm text-sm text-ink-300">
        Chyba na naší straně. Naměřená data jsou v bezpečí — měření běží lokálně a
        drží se v offline frontě, nic se neztratí.
      </p>
      <div className="mt-7 flex items-center gap-3">
        <button
          onClick={reset}
          className="cal-press rounded-[10px] bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-colors hover:bg-teal-600"
        >
          Zkusit znovu
        </button>
        <Link
          href="/admin"
          className="cal-press rounded-[10px] border border-white/15 px-4 py-2 text-sm font-semibold text-ink-200 transition-colors hover:bg-white/5"
        >
          Přehled akcí
        </Link>
      </div>
      <div className="mt-6 font-technical text-[11px] text-ink-500">
        CAS-500{error.digest ? ` · ${error.digest}` : ""}
      </div>
      <div className="mt-10">
        <PoweredBy variant="dark" />
      </div>
    </main>
  );
}
