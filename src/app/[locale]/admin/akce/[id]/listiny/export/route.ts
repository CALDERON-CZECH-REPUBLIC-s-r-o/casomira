import type { NextRequest } from "next/server";
import { auth } from "@/auth/nextauth";
import { nactiDataAkce } from "@/lib/listiny-data";
import { serazeneVysledky, startovniRadky } from "@/domain/vysledky";
import {
  vykresliStartovniPdf,
  type StartSekce,
} from "@/lib/pdf/startovni-pdf";
import {
  vykresliVysledkovouPdf,
  type VyslSekce,
} from "@/lib/pdf/vysledkova-pdf";
import { startovniXlsx, vysledkovaXlsx } from "@/lib/xlsx/listiny-xlsx";
import { vykresliLetakPdf } from "@/lib/pdf/letak-pdf";
import { verejnyOdkaz } from "@/lib/verejna-url";
import { qrPngDataUri } from "@/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function nazevKat(k: { kod: string | null; nazev: string }): string {
  return (k.kod ? `${k.kod} — ` : "") + k.nazev;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Neautorizováno", { status: 401 });

  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const typ = sp.get("typ") === "vysledkova" ? "vysledkova" : "startovni";
  const format = sp.get("format") === "xlsx" ? "xlsx" : "pdf";
  const sort = sp.get("sort") === "abeceda" ? "abeceda" : "cislo";
  const rozsah =
    sp.get("rozsah") ??
    (typ === "startovni" ? "celkova" : "kategorie");

  const data = await nactiDataAkce(id);
  if (!data) return new Response("Akce nenalezena", { status: 404 });

  // Leták (upoutávka na online výsledky) — 2× A5 na A4, ke stažení.
  if (sp.get("typ") === "letak") {
    const url = verejnyOdkaz(data.akce.slug);
    const qr = await qrPngDataUri(url);
    const pdf = await vykresliLetakPdf({
      nazev: data.akce.nazev,
      datum: data.akce.datum,
      misto: data.akce.misto,
      qr,
      url,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${data.akce.slug}-letak.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const kategorieKod = new Map(
    data.kategorie.map((k) => [k.id, k.kod ?? k.nazev]),
  );
  const katSerazene = [...data.kategorie].sort((a, b) => a.poradi - b.poradi);
  const nazevSouboru = `${data.akce.slug}-${typ}.${format === "pdf" ? "pdf" : "xlsx"}`;

  let telo: Uint8Array;
  let mime: string;

  if (format === "xlsx") {
    telo =
      typ === "startovni"
        ? await startovniXlsx(data, sort)
        : await vysledkovaXlsx(data);
    mime = XLSX_MIME;
  } else if (typ === "startovni") {
    let sekce: StartSekce[];
    let sKategorii: boolean;
    if (rozsah === "kategorie") {
      sekce = katSerazene
        .map((k) => ({
          nadpis: nazevKat(k),
          zavodnici: startovniRadky(
            data.zavodnici.filter((z) => z.kategorieId === k.id),
            sort,
          ),
        }))
        .filter((s) => s.zavodnici.length > 0);
      const bez = data.zavodnici.filter((z) => z.kategorieId === null);
      if (bez.length > 0) {
        sekce.push({
          nadpis: `Bez kategorie (${bez.length})`,
          zavodnici: startovniRadky(bez, sort),
        });
      }
      sKategorii = false;
    } else {
      sekce = [{ nadpis: null, zavodnici: startovniRadky(data.zavodnici, sort) }];
      sKategorii = true;
    }
    telo = await vykresliStartovniPdf({
      nazev: data.akce.nazev,
      datum: data.akce.datum,
      misto: data.akce.misto,
      podtitul:
        rozsah === "kategorie"
          ? "po kategoriích"
          : `${data.zavodnici.length} přihlášených`,
      sekce,
      sKategorii,
      kategorieKod,
    });
    mime = "application/pdf";
  } else {
    const vys = serazeneVysledky(
      data.zavodnici,
      data.zaznamy,
      data.akce.casStartu,
      data.kategorie,
    );
    let sekce: VyslSekce[];
    let sKategorii: boolean;
    if (rozsah === "celkova") {
      sekce = [{ nadpis: null, radky: vys.celkova.radky }];
      sKategorii = true;
    } else {
      sekce = vys.kategorie
        .filter((sk) => sk.radky.length > 0)
        .map((sk) => ({
          nadpis: nazevKat(sk.kategorie!),
          souhrn: sk,
          radky: sk.radky,
        }));
      sKategorii = false;
    }
    telo = await vykresliVysledkovouPdf({
      nazev: data.akce.nazev,
      datum: data.akce.datum,
      misto: data.akce.misto,
      podtitul: rozsah === "celkova" ? "celkové pořadí" : "po kategoriích",
      sekce,
      sKategorii,
      kategorieKod,
    });
    mime = "application/pdf";
  }

  return new Response(new Uint8Array(telo), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${nazevSouboru}"`,
      "Cache-Control": "no-store",
    },
  });
}
