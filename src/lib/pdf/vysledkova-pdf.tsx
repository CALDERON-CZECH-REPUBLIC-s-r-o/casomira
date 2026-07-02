import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  oddilNeboMesto,
  type VysledekRadek,
} from "@/domain/vysledky";
import { cistyCas, ztrata } from "@/lib/cas";
import { registrujFonty } from "./font";

export interface VyslSekce {
  nadpis: string | null;
  souhrn?: { klasifikovano: number; dnf: number; dns: number; dsq: number };
  radky: VysledekRadek[];
}

const STAV_LABEL: Record<string, string> = {
  DNF: "DNF",
  DNS: "DNS",
  DSQ: "DSQ",
  bez_casu: "—",
};

// Calderon paleta (viz globals.css) — PDF drží stejný vizuál jako UI listiny.
const s = StyleSheet.create({
  page: { fontFamily: "Noto", fontSize: 9, padding: 28, color: "#14201c" },
  nazev: { fontSize: 16, fontWeight: "bold", color: "#14201c" },
  meta: { fontSize: 9, color: "#5a6b64", marginBottom: 2 },
  typ: { fontSize: 12, fontWeight: "bold", color: "#2e7059", marginBottom: 10 },
  sekceNadpis: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#14201c",
    marginTop: 12,
    borderBottom: "1pt solid #e1e7e4",
    paddingBottom: 2,
  },
  souhrn: { fontSize: 8, color: "#5a6b64", marginBottom: 3 },
  hlavicka: {
    flexDirection: "row",
    borderBottom: "1.2pt solid #1e2d28",
    paddingBottom: 3,
  },
  hlavickaText: {
    fontSize: 8,
    fontWeight: "normal",
    color: "#5a6b64",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  radek: {
    flexDirection: "row",
    paddingVertical: 2,
    borderBottom: "0.5pt solid #ecf0ee",
  },
  // Barvy buněk se dědí z řádku, aby nedoběhnuvší (nedobehl) zešedly celí;
  // teal/tučné akcenty jen na buňkách, které mají jen klasifikovaní.
  nedobehl: { color: "#808e88" },
  poradi: { width: "7%" },
  poradiKlas: { color: "#2e7059", fontWeight: "bold" },
  cislo: { width: "8%" },
  prijmeni: { width: "20%", fontWeight: "bold" },
  jmeno: { width: "16%" },
  rocnik: { width: "7%" },
  oddil: { width: "22%" },
  kat: { width: "10%" },
  cas: { width: "12%", textAlign: "right" },
  casKlas: { fontWeight: "bold", color: "#14201c" },
  ztrata: { width: "12%", textAlign: "right" },
});

export function VysledkovaPDF({
  nazev,
  datum,
  misto,
  podtitul,
  sekce,
  sKategorii,
  kategorieKod,
}: {
  nazev: string;
  datum: string;
  misto: string | null;
  podtitul: string;
  sekce: VyslSekce[];
  sKategorii: boolean;
  kategorieKod: Map<string, string>;
}) {
  const d = new Date(datum + "T00:00:00");
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.nazev}>{nazev}</Text>
        <Text style={s.meta}>
          {`${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`}
          {misto ? ` · ${misto}` : ""}
        </Text>
        <Text style={s.typ}>Výsledková listina — {podtitul}</Text>

        {sekce.map((sk, idx) => (
          <View key={idx} wrap>
            {sk.nadpis && <Text style={s.sekceNadpis}>{sk.nadpis}</Text>}
            {sk.souhrn && (
              <Text style={s.souhrn}>
                {sk.souhrn.klasifikovano} klasifikováno
                {sk.souhrn.dnf ? ` · ${sk.souhrn.dnf} DNF` : ""}
                {sk.souhrn.dns ? ` · ${sk.souhrn.dns} DNS` : ""}
                {sk.souhrn.dsq ? ` · ${sk.souhrn.dsq} DSQ` : ""}
              </Text>
            )}
            <View style={s.hlavicka}>
              <Text style={[s.poradi, s.hlavickaText]}>Poř.</Text>
              <Text style={[s.cislo, s.hlavickaText]}>Číslo</Text>
              <Text style={[s.prijmeni, s.hlavickaText]}>Příjmení</Text>
              <Text style={[s.jmeno, s.hlavickaText]}>Jméno</Text>
              <Text style={[s.rocnik, s.hlavickaText]}>Roč.</Text>
              <Text style={[s.oddil, s.hlavickaText]}>Oddíl / Město</Text>
              {sKategorii && <Text style={[s.kat, s.hlavickaText]}>Kat.</Text>}
              <Text style={[s.cas, s.hlavickaText]}>Čas</Text>
              <Text style={[s.ztrata, s.hlavickaText]}>Ztráta</Text>
            </View>
            {sk.radky.map((r) => {
              const z = r.zavodnik;
              const nedobehl = r.stav !== "klasifikovan";
              return (
                <View
                  key={z.id}
                  style={[s.radek, ...(nedobehl ? [s.nedobehl] : [])]}
                  wrap={false}
                >
                  <Text
                    style={[s.poradi, ...(nedobehl ? [] : [s.poradiKlas])]}
                  >
                    {r.poradi ?? ""}
                  </Text>
                  <Text style={s.cislo}>{z.startovniCislo ?? "—"}</Text>
                  <Text style={s.prijmeni}>{z.prijmeni}</Text>
                  <Text style={s.jmeno}>{z.jmeno}</Text>
                  <Text style={s.rocnik}>{z.rokNarozeni ?? "—"}</Text>
                  <Text style={s.oddil}>{oddilNeboMesto(z) || "—"}</Text>
                  {sKategorii && (
                    <Text style={s.kat}>
                      {z.kategorieId
                        ? kategorieKod.get(z.kategorieId) ?? "—"
                        : "—"}
                    </Text>
                  )}
                  <Text style={[s.cas, ...(nedobehl ? [] : [s.casKlas])]}>
                    {r.stav === "klasifikovan" && r.cistyCasMs !== null
                      ? cistyCas(r.cistyCasMs)
                      : STAV_LABEL[r.stav] ?? "—"}
                  </Text>
                  <Text style={s.ztrata}>
                    {r.stav === "klasifikovan" ? ztrata(r.ztrataMs) : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </Page>
    </Document>
  );
}

/** Vyrenderuje výsledkovou listinu do PDF bufferu (volá route handler). */
export async function vykresliVysledkovouPdf(
  props: Parameters<typeof VysledkovaPDF>[0],
): Promise<Buffer> {
  registrujFonty();
  return renderToBuffer(<VysledkovaPDF {...props} />);
}
