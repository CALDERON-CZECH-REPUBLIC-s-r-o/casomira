import type { ReactNode } from "react";
import { AkceSidebar } from "./sidebar";
import { PoweredBy } from "./ui";

/**
 * Shell správy akce — tmavý sidebar vlevo + obsah vpravo. Používají ho admin
 * obrazovky akce (detail, kategorie, závodníci, opravy, listiny, publikování,
 * nastavení). Měřicí obrazovka a tiskové listiny ho záměrně nepoužívají
 * (vlastní focus/tisk chrome). Obsah si nese vlastní vnitřní kontejner.
 */
export function SpravaShell({
  akceId,
  nazev,
  uzivatel,
  children,
}: {
  akceId: string;
  nazev: string;
  uzivatel?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-ink-50">
      <AkceSidebar akceId={akceId} nazev={nazev} uzivatel={uzivatel} />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1">{children}</div>
        <footer className="flex justify-end border-t border-ink-150 px-8 py-4">
          <PoweredBy />
        </footer>
      </main>
    </div>
  );
}
