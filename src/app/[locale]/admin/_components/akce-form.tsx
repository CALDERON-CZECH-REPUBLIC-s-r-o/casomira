import type { Akce } from "@/db/schema";

/** Sdílená pole formuláře akce (vytvoření i úprava). */
export function AkceFormFields({ akce }: { akce?: Akce }) {
  return (
    <div className="flex flex-col gap-4">
      <label className="cal-label">
        Název akce *
        <input name="nazev" required defaultValue={akce?.nazev} className="cal-input" />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="cal-label">
          Datum *
          <input
            name="datum"
            type="date"
            required
            defaultValue={akce?.datum}
            className="cal-input"
          />
        </label>
        <label className="cal-label">
          Referenční rok (pro věk)
          <input
            name="rok"
            type="number"
            placeholder="dle data"
            defaultValue={akce?.rok}
            className="cal-input"
          />
        </label>
      </div>
      <label className="cal-label">
        Místo
        <input name="misto" defaultValue={akce?.misto ?? ""} className="cal-input" />
      </label>
      <label className="cal-label">
        Poznámka
        <textarea
          name="poznamka"
          rows={2}
          defaultValue={akce?.poznamka ?? ""}
          className="cal-input"
        />
      </label>
    </div>
  );
}
