"use client";

import { useState, type ReactNode } from "react";
import { Btn } from "@/app/admin/_components/ui";
import { Dialog } from "@/app/admin/_components/ui-client";
import type { MericiBod } from "@/db/schema";
import { upravitBod, vytvoritBod } from "@/server/body";

/**
 * Modální formulář pro přidání / úpravu měřicího bodu. `trigger(open)` vykreslí
 * spouštěč (tlačítko/odkaz), který dialog otevře — jako u ZavodnikFormDialog.
 */
export function BodFormDialog({
  akceId,
  bod,
  trigger,
}: {
  akceId: string;
  bod?: MericiBod;
  trigger: (open: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const jeUprava = Boolean(bod);
  const action = bod
    ? upravitBod.bind(null, bod.id, akceId)
    : vytvoritBod.bind(null, akceId);

  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={jeUprava ? "Upravit měřicí bod" : "Přidat měřicí bod"}
      >
        <form
          action={action}
          onSubmit={() => setOpen(false)}
          className="space-y-4"
        >
          <label className="cal-label">
            Název*
            <input
              name="nazev"
              required
              defaultValue={bod?.nazev ?? ""}
              className="cal-input"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="cal-label">
              Pořadí
              <input
                name="poradi"
                type="number"
                defaultValue={bod?.poradi ?? ""}
                className="cal-input"
              />
            </label>
            <label className="cal-label">
              Vzdálenost od startu (m)
              <input
                name="vzdalenostM"
                type="number"
                defaultValue={bod?.vzdalenostM ?? ""}
                className="cal-input"
              />
            </label>
          </div>

          <label className="cal-label">
            Typ
            <select
              name="typ"
              defaultValue={bod?.typ ?? "prubezna"}
              className="cal-input"
            >
              <option value="startovni">startovní</option>
              <option value="prubezna">průběžná</option>
              <option value="cilova">cílová</option>
            </select>
          </label>

          <label className="cal-label">
            Zařízení
            <input
              name="zarizeni"
              defaultValue={bod?.zarizeni ?? ""}
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
