import type { ReactNode } from "react";

/**
 * Shell administrace — Calderon brand font (Now) + světlé „ink" pozadí pro
 * všechny admin stránky. Záměrně bez horního baru: měřicí obrazovka má vlastní
 * plnohodnotnou hlavičku a nechceme ji duplikovat. Odhlášení žije na rozcestníku.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="font-brand flex-1 bg-ink-50 text-ink-900">{children}</div>
  );
}
