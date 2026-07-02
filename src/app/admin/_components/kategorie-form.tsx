import type { Kategorie } from "@/db/schema";

/** Sdílená pole formuláře kategorie (vytvoření i úprava). */
export function KategorieFormFields({ kat }: { kat?: Kategorie }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_6rem_8rem] gap-3">
        <label className="cal-label">
          Název *
          <input
            name="nazev"
            required
            defaultValue={kat?.nazev}
            placeholder="Muži do 40 let"
            className="cal-input"
          />
        </label>
        <label className="cal-label">
          Kód
          <input
            name="kod"
            defaultValue={kat?.kod ?? ""}
            placeholder="M40"
            className="cal-input font-technical"
          />
        </label>
        <label className="cal-label">
          Pohlaví *
          <select
            name="pohlavi"
            defaultValue={kat?.pohlavi ?? "M"}
            className="cal-input"
          >
            <option value="M">Muži</option>
            <option value="Z">Ženy</option>
            <option value="smisene">Smíšené</option>
          </select>
        </label>
      </div>

      <fieldset className="grid grid-cols-2 gap-3 rounded-[10px] border border-ink-200 bg-ink-50 p-3">
        <legend className="cal-eyebrow px-1 text-ink-500">
          Omezení věkem (proti referenčnímu roku akce) — vyplň buď věk, nebo ročník
        </legend>
        <label className="cal-label">
          Věk od
          <input
            name="vekOd"
            type="number"
            defaultValue={kat?.vekOd ?? ""}
            className="cal-input font-technical tabular-nums"
          />
        </label>
        <label className="cal-label">
          Věk do
          <input
            name="vekDo"
            type="number"
            defaultValue={kat?.vekDo ?? ""}
            className="cal-input font-technical tabular-nums"
          />
        </label>
        <label className="cal-label">
          Ročník od
          <input
            name="rokNarozeniOd"
            type="number"
            defaultValue={kat?.rokNarozeniOd ?? ""}
            className="cal-input font-technical tabular-nums"
          />
        </label>
        <label className="cal-label">
          Ročník do
          <input
            name="rokNarozeniDo"
            type="number"
            defaultValue={kat?.rokNarozeniDo ?? ""}
            className="cal-input font-technical tabular-nums"
          />
        </label>
      </fieldset>

      <label className="cal-label w-32">
        Pořadí ve výstupech
        <input
          name="poradi"
          type="number"
          defaultValue={kat?.poradi ?? 0}
          className="cal-input font-technical tabular-nums"
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
