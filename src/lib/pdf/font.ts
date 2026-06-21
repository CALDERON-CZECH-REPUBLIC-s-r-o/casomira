import path from "node:path";
import { Font } from "@react-pdf/renderer";

/**
 * Registruje Noto Sans (s českou diakritikou) pro PDF. Standardní Helvetica
 * v @react-pdf nezvládne č/ř/ě/ů. Voláno jednou před renderem.
 */
let registrovano = false;

export function registrujFonty() {
  if (registrovano) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Noto",
    fonts: [
      { src: path.join(dir, "NotoSans-Regular.ttf") },
      { src: path.join(dir, "NotoSans-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  // Bez dělení slov (jinak react-pdf láme i jména s pomlčkou).
  Font.registerHyphenationCallback((slovo) => [slovo]);
  registrovano = true;
}
