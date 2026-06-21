"use client";

import Link from "next/link";

/** Lišta nad listinou — skrytá při tisku. Tlačítko vyvolá tiskový dialog. */
export function TiskToolbar({
  zpetHref,
  titulek,
}: {
  zpetHref: string;
  titulek: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between print:hidden">
      <Link href={zpetHref} className="text-sm text-gray-500 hover:underline">
        ← {titulek}
      </Link>
      <button
        onClick={() => window.print()}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      >
        🖨 Tisk / uložit PDF
      </button>
    </div>
  );
}
