import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { oddilNeboMesto, type ZavodnikVysledek } from "@/domain/vysledky";
import { registrujFonty } from "./font";

export interface StartSekce {
  nadpis: string | null;
  zavodnici: ZavodnikVysledek[];
}

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
    marginBottom: 3,
    borderBottom: "1pt solid #e1e7e4",
    paddingBottom: 2,
  },
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
  cislo: { width: "9%", color: "#2c3a35" },
  prijmeni: { width: "24%", fontWeight: "bold", color: "#14201c" },
  jmeno: { width: "20%", color: "#2c3a35" },
  rocnik: { width: "9%", color: "#41514b" },
  oddil: { width: "26%", color: "#41514b" },
  kat: { width: "12%", color: "#41514b" },
});

export function StartovniPDF({
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
  sekce: StartSekce[];
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
        <Text style={s.typ}>Startovní listina — {podtitul}</Text>

        {sekce.map((sk, idx) => (
          <View key={idx} wrap>
            {sk.nadpis && <Text style={s.sekceNadpis}>{sk.nadpis}</Text>}
            <View style={s.hlavicka}>
              <Text style={[s.cislo, s.hlavickaText]}>Číslo</Text>
              <Text style={[s.prijmeni, s.hlavickaText]}>Příjmení</Text>
              <Text style={[s.jmeno, s.hlavickaText]}>Jméno</Text>
              <Text style={[s.rocnik, s.hlavickaText]}>Roč.</Text>
              <Text style={[s.oddil, s.hlavickaText]}>Oddíl / Město</Text>
              {sKategorii && <Text style={[s.kat, s.hlavickaText]}>Kat.</Text>}
            </View>
            {sk.zavodnici.map((z) => (
              <View key={z.id} style={s.radek} wrap={false}>
                <Text style={s.cislo}>{z.startovniCislo ?? "—"}</Text>
                <Text style={s.prijmeni}>{z.prijmeni}</Text>
                <Text style={s.jmeno}>{z.jmeno}</Text>
                <Text style={s.rocnik}>{z.rokNarozeni ?? "—"}</Text>
                <Text style={s.oddil}>{oddilNeboMesto(z) || "—"}</Text>
                {sKategorii && (
                  <Text style={s.kat}>
                    {z.kategorieId ? kategorieKod.get(z.kategorieId) ?? "—" : "—"}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

/** Vyrenderuje startovní listinu do PDF bufferu (volá route handler). */
export async function vykresliStartovniPdf(
  props: Parameters<typeof StartovniPDF>[0],
): Promise<Buffer> {
  registrujFonty();
  return renderToBuffer(<StartovniPDF {...props} />);
}
