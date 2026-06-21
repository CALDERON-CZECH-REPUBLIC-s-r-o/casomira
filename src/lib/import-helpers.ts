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

/** Převede buňku na celé číslo (vytáhne číslice), jinak null. */
export function parseCislo(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n =
    typeof raw === "number"
      ? Math.trunc(raw)
      : parseInt(String(raw).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}
