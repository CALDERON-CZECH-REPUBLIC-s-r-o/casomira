import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { akce as akceT } from "@/db/schema";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { verejnyOdkaz } from "@/lib/verejna-url";
import { qrSvgDataUri } from "@/lib/qr";
import { TiskToolbar } from "../_components/tisk-toolbar";

export const dynamic = "force-dynamic";

/**
 * Tiskový leták (upoutávka na online výsledky) — dva shodné letáky A5 na jednu
 * stranu A4 (na výšku, půlí se). Logo v záhlaví, název akce, datum, QR + odkaz.
 */
export default async function LetakPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await vyzadujPrihlaseni();
  const { id } = await params;

  const akce = await db.query.akce.findFirst({ where: eq(akceT.id, id) });
  if (!akce) notFound();

  const url = verejnyOdkaz(akce.slug);
  const urlKratka = url.replace(/^https?:\/\//, "");
  const qr = await qrSvgDataUri(url);

  const d = new Date(akce.datum + "T00:00:00");
  const datumCz = `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;

  return (
    <main className="mx-auto max-w-[220mm] p-6 print:max-w-none print:p-0">
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .letak-a4 { box-shadow: none !important; }
          .letak { break-inside: avoid; }
        }
      `}</style>

      <TiskToolbar zpetHref={`/admin/akce/${id}/listiny`} titulek="Listiny" />

      {/* A4 na výšku = dva letáky A5 nad sebou */}
      <div
        className="letak-a4 mx-auto bg-white shadow-[var(--shadow-md)] print:shadow-none"
        style={{ width: "210mm", height: "297mm" }}
      >
        <Letak
          nazev={akce.nazev}
          datum={datumCz}
          misto={akce.misto}
          qr={qr}
          urlKratka={urlKratka}
          delici
        />
        <Letak
          nazev={akce.nazev}
          datum={datumCz}
          misto={akce.misto}
          qr={qr}
          urlKratka={urlKratka}
        />
      </div>
    </main>
  );
}

function Letak({
  nazev,
  datum,
  misto,
  qr,
  urlKratka,
  delici,
}: {
  nazev: string;
  datum: string;
  misto: string | null;
  qr: string;
  urlKratka: string;
  delici?: boolean;
}) {
  return (
    <section
      className="letak flex flex-col justify-between"
      style={{
        height: "148.5mm",
        padding: "14mm 16mm",
        borderBottom: delici ? "1px dashed #b6c1bc" : undefined,
        color: "var(--ink-900)",
      }}
    >
      {/* Záhlaví — logo + datum */}
      <header className="flex items-center justify-between gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/casomir-logo.png" alt="Časomír" style={{ height: "12mm", width: "auto" }} />
        <span
          className="font-technical tabular-nums"
          style={{ fontSize: "11pt", color: "var(--ink-500)" }}
        >
          {datum}
          {misto ? ` · ${misto}` : ""}
        </span>
      </header>

      {/* Tělo — vlevo text, vpravo QR */}
      <div className="flex items-center justify-between gap-8">
        <div className="min-w-0 flex-1">
          <div
            className="cal-eyebrow"
            style={{ color: "var(--teal-600)", fontSize: "10pt" }}
          >
            Živé výsledky online
          </div>
          <h1
            className="font-display font-bold tracking-tight"
            style={{ fontSize: "26pt", lineHeight: 1.05, marginTop: "3mm" }}
          >
            {nazev}
          </h1>
          <p style={{ fontSize: "12pt", color: "var(--ink-600)", marginTop: "4mm" }}>
            Naskenujte QR kód a sledujte startovku i průběžné pořadí živě na mobilu.
          </p>
        </div>

        <div className="flex-none text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt={`QR: ${urlKratka}`}
            style={{
              width: "42mm",
              height: "42mm",
              border: "1px solid #e1e7e4",
              borderRadius: "6px",
              padding: "2mm",
            }}
          />
          <div
            className="font-technical"
            style={{ fontSize: "12pt", fontWeight: 600, marginTop: "3mm", color: "var(--ink-900)" }}
          >
            {urlKratka}
          </div>
        </div>
      </div>

      {/* Patička */}
      <div
        className="font-technical"
        style={{ fontSize: "8pt", color: "var(--ink-400)", letterSpacing: ".04em" }}
      >
        POWERED BY ČASOMÍR · CASOMIR.CZ
      </div>
    </section>
  );
}
