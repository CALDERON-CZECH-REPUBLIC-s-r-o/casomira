import { vyzadujPrihlaseni } from "@/auth/guard";
import { BackLink } from "../../_components/ui";
import { PdfImportHistorie } from "./pdf-import-historie";

export const dynamic = "force-dynamic";

/**
 * Import historických výsledků z PDF do samostatné statistiky
 * (`historicky_vysledek`). Nezasahuje do startovních listin ani měření akcí.
 */
export default async function HistorieImportPage() {
  await vyzadujPrihlaseni();

  return (
    <main className="min-h-screen bg-ink-50">
      <div className="cal-dots border-b border-ink-200 bg-[rgba(248,250,249,.92)]">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="mb-3">
            <BackLink href="/admin/historie">Historie</BackLink>
          </div>
          <div className="cal-eyebrow mb-1 text-teal-600">Import</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            Import historických výsledků z PDF
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Zadej ročník, nahraj PDF výsledkovou listinu a namapuj sloupce.
            Uloží se jako <strong>statistika</strong> — neobjeví se ve startovní
            listině žádné akce.
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-4xl px-6 py-6">
        <PdfImportHistorie />
      </section>
    </main>
  );
}
