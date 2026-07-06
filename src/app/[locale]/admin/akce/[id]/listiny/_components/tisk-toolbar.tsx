"use client";

import { BackLink, Btn } from "../../../../_components/ui";

/** Lišta nad listinou — skrytá při tisku. Tlačítko vyvolá tiskový dialog. */
export function TiskToolbar({
  zpetHref,
  titulek,
}: {
  zpetHref: string;
  titulek: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between print:hidden">
      <BackLink href={zpetHref}>{titulek}</BackLink>
      <Btn variant="dark" onClick={() => window.print()}>
        🖨 Tisk / uložit PDF
      </Btn>
    </div>
  );
}
