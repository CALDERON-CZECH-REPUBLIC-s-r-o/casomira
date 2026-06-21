import type { Akce } from "@/db/schema";

/** Sdílená pole formuláře akce (vytvoření i úprava). */
export function AkceFormFields({ akce }: { akce?: Akce }) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Název akce *
        <input
          name="nazev"
          required
          defaultValue={akce?.nazev}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Datum *
          <input
            name="datum"
            type="date"
            required
            defaultValue={akce?.datum}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Referenční rok (pro věk)
          <input
            name="rok"
            type="number"
            placeholder="dle data"
            defaultValue={akce?.rok}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Místo
        <input
          name="misto"
          defaultValue={akce?.misto ?? ""}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Poznámka
        <textarea
          name="poznamka"
          rows={2}
          defaultValue={akce?.poznamka ?? ""}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
    </div>
  );
}
