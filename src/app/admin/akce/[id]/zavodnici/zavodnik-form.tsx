"use client";

import { useState, type ReactNode } from "react";
import { Btn } from "@/app/admin/_components/ui";
import { Dialog, SegmentedToggle } from "@/app/admin/_components/ui-client";
import { upravitZavodnika, vytvoritZavodnika } from "@/server/zavodnici";

type ZavodnikData = {
  id: string;
  jmeno: string;
  prijmeni: string;
  rokNarozeni: number | null;
  pohlavi: "M" | "Z" | null;
  startovniCislo: number | null;
  oddil: string | null;
  mesto: string | null;
};

/**
 * Modální formulář pro přidání / úpravu závodníka. `trigger(open)` vykreslí
 * spouštěč (tlačítko/odkaz), který dialog otevře — jako u ConfirmDialog.
 */
export function ZavodnikFormDialog({
  akceId,
  zavodnik,
  trigger,
}: {
  akceId: string;
  zavodnik?: ZavodnikData;
  trigger: (open: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const jeUprava = Boolean(zavodnik);
  const action = zavodnik
    ? upravitZavodnika.bind(null, zavodnik.id, akceId)
    : vytvoritZavodnika.bind(null, akceId);

  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={jeUprava ? "Upravit závodníka" : "Přidat závodníka"}
      >
        <form action={action} onSubmit={() => setOpen(false)} className="space-y-4">
          <label className="cal-label">
            Příjmení*
            <input
              name="prijmeni"
              required
              defaultValue={zavodnik?.prijmeni ?? ""}
              className="cal-input"
            />
          </label>

          <label className="cal-label">
            Jméno
            <input
              name="jmeno"
              defaultValue={zavodnik?.jmeno ?? ""}
              className="cal-input"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="cal-label">
              Startovní číslo
              <input
                name="startovniCislo"
                type="number"
                defaultValue={zavodnik?.startovniCislo ?? ""}
                className="cal-input"
              />
            </label>
            <label className="cal-label">
              Ročník
              <input
                name="rokNarozeni"
                type="number"
                defaultValue={zavodnik?.rokNarozeni ?? ""}
                className="cal-input"
              />
            </label>
          </div>

          <div className="cal-label">
            Pohlaví
            <div className="mt-1">
              <SegmentedToggle
                name="pohlavi"
                options={[
                  { value: "M", label: "Muž" },
                  { value: "Z", label: "Žena" },
                ]}
                defaultValue={zavodnik?.pohlavi ?? undefined}
              />
            </div>
          </div>

          <label className="cal-label">
            Oddíl
            <input
              name="oddil"
              defaultValue={zavodnik?.oddil ?? ""}
              className="cal-input"
            />
          </label>

          <label className="cal-label">
            Město
            <input
              name="mesto"
              defaultValue={zavodnik?.mesto ?? ""}
              className="cal-input"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Btn variant="ghost" type="button" onClick={() => setOpen(false)}>
              Zrušit
            </Btn>
            <Btn type="submit">{jeUprava ? "Uložit" : "Přidat"}</Btn>
          </div>
        </form>
      </Dialog>
    </>
  );
}
