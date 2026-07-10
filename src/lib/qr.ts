import QRCode from "qrcode";

/**
 * Vygeneruje QR kód jako inline SVG data URI (ostrý, škálovatelný, bez klientského
 * JS). Použitelné v `<img src>` na serveru i jako návratová hodnota server akce.
 */
export async function qrSvgDataUri(text: string): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * QR kód jako PNG data URL — pro PDF (@react-pdf `<Image>` neumí SVG).
 */
export async function qrPngDataUri(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 480,
    errorCorrectionLevel: "M",
  });
}
