/** Pomocné čisté funkce pro import přihlášek (testovatelné mimo UI). */

/**
 * Rozdělí slité „Příjmení Jméno" na dvě pole. Podporuje oddělení čárkou
 * i mezerou a obě pořadí. U víceslovných jmen padne zbytek do jména.
 */
export function rozdelJmeno(
  cele: string,
  poradi: "PJ" | "JP",
): { prijmeni: string; jmeno: string } {
  const s = cele.trim().replace(/\s+/g, " ");
  if (s === "") return { prijmeni: "", jmeno: "" };
  if (s.includes(",")) {
    const [a, b = ""] = s.split(",");
    return poradi === "PJ"
      ? { prijmeni: a.trim(), jmeno: b.trim() }
      : { prijmeni: b.trim(), jmeno: a.trim() };
  }
  const parts = s.split(" ");
  if (parts.length === 1) return { prijmeni: parts[0], jmeno: "" };
  return poradi === "PJ"
    ? { prijmeni: parts[0], jmeno: parts.slice(1).join(" ") }
    : { prijmeni: parts[parts.length - 1], jmeno: parts.slice(0, -1).join(" ") };
}

/**
 * Parsuje čas výsledku na ms. Přijímá `mm:ss`, `mm:ss.d`, `h:mm:ss`, `h:mm:ss.d`
 * (čárka i tečka jako desetinná). Vrací null, když formát nesedí.
 */
export function parseCasNaMs(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  const m = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = parseInt(m[2], 10);
  const sec = parseFloat(m[3]);
  if (min > 59 || sec >= 60) return null;
  return Math.round(((h * 60 + min) * 60 + sec) * 1000);
}

/** Převede buňku na celé číslo (vytáhne číslice), jinak null. */
export function parseCislo(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n =
    typeof raw === "number"
      ? Math.trunc(raw)
      : parseInt(String(raw).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}
