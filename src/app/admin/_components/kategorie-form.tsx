import type { Kategorie } from "@/db/schema";

/** Sdílená pole formuláře kategorie (vytvoření i úprava). */
export function KategorieFormFields({ kat }: { kat?: Kategorie }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_6rem_8rem] gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Název *
          <input
            name="nazev"
            required
            defaultValue={kat?.nazev}
            placeholder="Muži do 40 let"
            className="rounded-md border border-gray-300 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kód
          <input
            name="kod"
            defaultValue={kat?.kod ?? ""}
            placeholder="M40"
            className="rounded-md border border-gray-300 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Pohlaví *
          <select
            name="pohlavi"
            defaultValue={kat?.pohlavi ?? "M"}
            className="rounded-md border border-gray-300 px-2 py-1.5"
          >
            <option value="M">Muži</option>
            <option value="Z">Ženy</option>
            <option value="smisene">Smíšené</option>
          </select>
        </label>
      </div>

      <fieldset className="grid grid-cols-2 gap-3 rounded-md border border-gray-200 p-3">
        <legend className="px-1 text-xs text-gray-500">
          Omezení věkem (proti referenčnímu roku akce) — vyplň buď věk, nebo ročník
        </legend>
        <label className="flex flex-col gap-1 text-sm">
          Věk od
          <input
            name="vekOd"
            type="number"
            defaultValue={kat?.vekOd ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Věk do
          <input
            name="vekDo"
            type="number"
            defaultValue={kat?.vekDo ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ročník od
          <input
            name="rokNarozeniOd"
            type="number"
            defaultValue={kat?.rokNarozeniOd ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ročník do
          <input
            name="rokNarozeniDo"
            type="number"
            defaultValue={kat?.rokNarozeniDo ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5"
          />
        </label>
      </fieldset>

      <label className="flex w-32 flex-col gap-1 text-sm">
        Pořadí ve výstupech
        <input
          name="poradi"
          type="number"
          defaultValue={kat?.poradi ?? 0}
          className="rounded-md border border-gray-300 px-2 py-1.5"
        />
      </label>
    </div>
  );
}

/** Krátký textový popis pravidla kategorie (pro výpis). */
export function popisPravidla(kat: Kategorie): string {
  const pohlavi =
    kat.pohlavi === "M" ? "Muži" : kat.pohlavi === "Z" ? "Ženy" : "Smíšené";
  let rozsah = "bez omezení věku";
  if (kat.vekOd !== null || kat.vekDo !== null) {
    rozsah = `věk ${kat.vekOd ?? "–"}–${kat.vekDo ?? "–"}`;
  } else if (kat.rokNarozeniOd !== null || kat.rokNarozeniDo !== null) {
    rozsah = `ročník ${kat.rokNarozeniOd ?? "–"}–${kat.rokNarozeniDo ?? "–"}`;
  }
  return `${pohlavi} · ${rozsah}`;
}
