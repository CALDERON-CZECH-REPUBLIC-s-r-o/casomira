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

const s = StyleSheet.create({
  page: { fontFamily: "Noto", fontSize: 9, padding: 28, color: "#111" },
  nazev: { fontSize: 15, fontWeight: "bold" },
  meta: { fontSize: 9, color: "#555", marginBottom: 2 },
  typ: { fontSize: 12, fontWeight: "bold", marginBottom: 8 },
  sekceNadpis: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 10,
    borderBottom: "1pt solid #888",
    paddingBottom: 2,
  },
  souhrn: { fontSize: 8, color: "#666", marginBottom: 3 },
  hlavicka: {
    flexDirection: "row",
    borderBottom: "1.5pt solid #333",
    paddingBottom: 2,
    fontWeight: "bold",
  },
  radek: {
    flexDirection: "row",
    paddingVertical: 1.5,
    borderBottom: "0.5pt solid #eee",
  },
  nedobehl: { color: "#888" },
  poradi: { width: "7%" },
  cislo: { width: "8%" },
  prijmeni: { width: "20%", fontWeight: "bold" },
  jmeno: { width: "16%" },
  rocnik: { width: "7%" },
  oddil: { width: "22%" },
  kat: { width: "10%" },
  cas: { width: "12%", textAlign: "right" },
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
              <Text style={s.poradi}>Poř.</Text>
              <Text style={s.cislo}>Číslo</Text>
              <Text style={s.prijmeni}>Příjmení</Text>
              <Text style={s.jmeno}>Jméno</Text>
              <Text style={s.rocnik}>Roč.</Text>
              <Text style={s.oddil}>Oddíl / Město</Text>
              {sKategorii && <Text style={s.kat}>Kat.</Text>}
              <Text style={s.cas}>Čas</Text>
              <Text style={s.ztrata}>Ztráta</Text>
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
                  <Text style={s.poradi}>{r.poradi ?? ""}</Text>
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
                  <Text style={s.cas}>
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
