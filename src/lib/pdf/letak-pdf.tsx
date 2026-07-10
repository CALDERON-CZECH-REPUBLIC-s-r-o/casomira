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
import { registrujFonty } from "./font";

const LOGO = path.join(process.cwd(), "public", "casomir-logo.png");

export interface LetakProps {
  nazev: string;
  datum: string; // YYYY-MM-DD
  misto: string | null;
  qr: string; // PNG data URL
  url: string; // zobrazovaný odkaz, např. casomir.cz/slug
}

const s = StyleSheet.create({
  page: { fontFamily: "Noto", flexDirection: "column", color: "#14201c" },
  // Půlka A4 = jeden leták A5; flexGrow oba → přesně 50/50, žádné přetečení.
  half: {
    flexGrow: 1,
    flexBasis: 0,
    paddingVertical: 34,
    paddingHorizontal: 44,
    justifyContent: "space-between",
  },
  halfTop: { borderBottom: "1pt dashed #b6c1bc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { width: 74, height: 27 },
  date: { fontSize: 11, color: "#5a6b64" },
  body: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: { width: 320, paddingRight: 20 },
  eyebrow: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#3c9277",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  nazev: { fontSize: 25, fontWeight: "bold", color: "#14201c", marginTop: 8 },
  instr: { fontSize: 12, color: "#41514b", marginTop: 10, lineHeight: 1.4 },
  qrWrap: { width: 132, alignItems: "center" },
  qr: { width: 118, height: 118, border: "1pt solid #e1e7e4", padding: 4 },
  url: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#14201c",
    textAlign: "center",
    marginBottom: 6,
  },
  footer: {
    fontSize: 8,
    color: "#808e88",
    letterSpacing: 0.6,
    textAlign: "center",
  },
});

function Letak({
  top,
  nazev,
  datumCz,
  misto,
  qr,
  url,
}: {
  top?: boolean;
  nazev: string;
  datumCz: string;
  misto: string | null;
  qr: string;
  url: string;
}) {
  return (
    <View style={top ? [s.half, s.halfTop] : s.half}>
      <View style={s.header}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={LOGO} style={s.logo} />
        <Text style={s.date}>
          {datumCz}
          {misto ? ` · ${misto}` : ""}
        </Text>
      </View>

      <View style={s.body}>
        <View style={s.left}>
          <Text style={s.eyebrow}>Živé výsledky online</Text>
          <Text style={s.nazev}>{nazev}</Text>
          <Text style={s.instr}>
            Naskenujte QR kód a sledujte startovku i průběžné pořadí živě na
            mobilu.
          </Text>
        </View>
        <View style={s.qrWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={qr} style={s.qr} />
        </View>
      </View>

      <View>
        <Text style={s.url}>{url}</Text>
        <Text style={s.footer}>POWERED BY ČASOMÍR · CASOMIR.CZ</Text>
      </View>
    </View>
  );
}

export function LetakPDF({ nazev, datum, misto, qr, url }: LetakProps) {
  const d = new Date(datum + "T00:00:00");
  const datumCz = `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letak top nazev={nazev} datumCz={datumCz} misto={misto} qr={qr} url={url} />
        <Letak nazev={nazev} datumCz={datumCz} misto={misto} qr={qr} url={url} />
      </Page>
    </Document>
  );
}

/** Vyrenderuje leták (2× A5 na A4) do PDF bufferu. */
export async function vykresliLetakPdf(props: LetakProps): Promise<Buffer> {
  registrujFonty();
  return renderToBuffer(<LetakPDF {...props} />);
}
