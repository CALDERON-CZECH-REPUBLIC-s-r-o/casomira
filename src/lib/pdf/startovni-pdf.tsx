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

const s = StyleSheet.create({
  page: { fontFamily: "Noto", fontSize: 9, padding: 28, color: "#111" },
  nazev: { fontSize: 15, fontWeight: "bold" },
  meta: { fontSize: 9, color: "#555", marginBottom: 2 },
  typ: { fontSize: 12, fontWeight: "bold", marginBottom: 8 },
  sekceNadpis: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 3,
    borderBottom: "1pt solid #888",
    paddingBottom: 2,
  },
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
  cislo: { width: "9%" },
  prijmeni: { width: "24%", fontWeight: "bold" },
  jmeno: { width: "20%" },
  rocnik: { width: "9%" },
  oddil: { width: "26%" },
  kat: { width: "12%" },
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
              <Text style={s.cislo}>Číslo</Text>
              <Text style={s.prijmeni}>Příjmení</Text>
              <Text style={s.jmeno}>Jméno</Text>
              <Text style={s.rocnik}>Roč.</Text>
              <Text style={s.oddil}>Oddíl / Město</Text>
              {sKategorii && <Text style={s.kat}>Kat.</Text>}
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
