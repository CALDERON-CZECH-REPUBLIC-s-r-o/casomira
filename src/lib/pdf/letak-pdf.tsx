import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import path from "node:path";
import { DateTime } from "luxon";
import { registrujFonty } from "./font";

const LOGO = path.join(process.cwd(), "public", "casomir-logo.png");

export interface LetakProps {
  nazev: string;
  datum: string; // YYYY-MM-DD
  misto: string | null;
  qr: string; // PNG data URL
  url: string; // plný odkaz vč. https://
}

const INK = "#14201c";
const GRAY = "#5a6b64";
const GRAY2 = "#808e88";

const s = StyleSheet.create({
  page: {
    fontFamily: "Now",
    color: INK,
    paddingVertical: 46,
    paddingHorizontal: 52,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { width: 96, height: 35 },
  misto: {
    fontFamily: "Noto",
    fontSize: 11,
    fontWeight: "bold",
    color: GRAY2,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  rule: { borderBottom: "1.5pt solid " + INK, marginTop: 12 },

  stred: { alignItems: "center", marginTop: 30 },
  nazev: { fontSize: 26, fontWeight: "bold", color: INK, textAlign: "center" },
  datum: {
    fontFamily: "Noto",
    fontSize: 11,
    color: GRAY,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 5,
  },
  headline: {
    fontFamily: "NowAlt",
    fontWeight: 900,
    fontSize: 52,
    color: INK,
    textAlign: "center",
    marginTop: 18,
  },
  podtitul: {
    fontSize: 14,
    color: GRAY,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 1.4,
    maxWidth: 340,
  },

  qrWrap: { alignItems: "center", marginTop: 26 },
  qr: { width: 210, height: 210 },

  urlBox: {
    alignSelf: "center",
    marginTop: 26,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  url: {
    fontFamily: "Noto",
    fontSize: 17,
    fontWeight: "bold",
    color: INK,
    letterSpacing: 0.5,
  },

  body3: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
  },
  bod: { width: "31%", alignItems: "center" },
  kruh: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: INK,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  kruhCislo: { fontFamily: "Noto", fontSize: 12, fontWeight: "bold", color: INK },
  bodText: { fontSize: 11, color: GRAY, textAlign: "center", lineHeight: 1.35 },
});

const BODY = [
  "Průběžné pořadí naživo, hned po doběhu",
  "Celkové výsledky, kategorie a hledání",
  "Bez přihlášení, zdarma, funguje na každém telefonu",
];

export function LetakPDF({ nazev, datum, misto, qr, url }: LetakProps) {
  const datumText = DateTime.fromISO(datum)
    .setLocale("cs")
    .toFormat("cccc d. M. yyyy")
    .toUpperCase();

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Záhlaví */}
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO} style={s.logo} />
          {misto ? <Text style={s.misto}>{misto}</Text> : <Text> </Text>}
        </View>
        <View style={s.rule} />

        {/* Střed */}
        <View style={s.stred}>
          <Text style={s.nazev}>{nazev}</Text>
          <Text style={s.datum}>{datumText}</Text>
          <Text style={s.headline}>Výsledky online</Text>
          <Text style={s.podtitul}>
            Naskenujte kód telefonem, nebo zadejte adresu do prohlížeče.
          </Text>
        </View>

        {/* QR */}
        <View style={s.qrWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={qr} style={s.qr} />
        </View>

        {/* URL v rámečku */}
        <View style={s.urlBox}>
          <Text style={s.url}>{url}</Text>
        </View>

        {/* 3 body */}
        <View style={s.body3}>
          {BODY.map((t, i) => (
            <View key={i} style={s.bod}>
              <View style={s.kruh}>
                <Text style={s.kruhCislo}>{i + 1}</Text>
              </View>
              <Text style={s.bodText}>{t}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

/** Vyrenderuje leták (A4 plakát) do PDF bufferu. */
export async function vykresliLetakPdf(props: LetakProps): Promise<Buffer> {
  registrujFonty();
  return renderToBuffer(<LetakPDF {...props} />);
}
