"use client";

import { useState } from "react";
import { vlozitRucniPruchod } from "@/server/opravy";
import { Btn } from "../../../_components/ui";
import { SegmentedToggle } from "@/app/[locale]/admin/_components/ui-client";

/**
 * Ruční vložení vynechaného průchodu — dvě varianty zadání času:
 *  „Čas dne" (HH:mm:ss.SSS) nebo „Čistý čas" (mm:ss.SS, počítá se od startu).
 */
export function RucniPruchodForm({
  akceId,
  datum,
  startNastaven,
}: {
  akceId: string;
  datum: string;
  startNastaven: boolean;
}) {
  const [rezim, setRezim] = useState<"dne" | "cisty">("dne");
  const cisty = rezim === "cisty";

  return (
    <form
      action={vlozitRucniPruchod.bind(null, akceId)}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="datum" value={datum} />
      <input type="hidden" name="rezim" value={rezim} />

      <SegmentedToggle
        key={rezim}
        defaultValue={rezim}
        onChange={(v) => setRezim(v as "dne" | "cisty")}
        options={[
          { value: "dne", label: "Čas dne" },
          { value: "cisty", label: "Čistý čas" },
        ]}
      />

      <div className="flex flex-wrap items-end gap-4">
        <label className="cal-label">
          {cisty ? "Čistý čas (mm:ss.SS)" : "Čas dne (HH:mm:ss.SSS)"}
          <input
            name="cas"
            required
            placeholder={cisty ? "17:42.30" : "14:03:27.480"}
            className="cal-input w-44 font-technical tabular-nums"
          />
        </label>
        <label className="cal-label">
          Číslo (volitelně)
          <input
            name="cislo"
            inputMode="numeric"
            className="cal-input w-28 font-technical tabular-nums"
          />
        </label>
        <Btn type="submit" disabled={cisty && !startNastaven}>
          Vložit
        </Btn>
      </div>

      {cisty &&
        (startNastaven ? (
          <p className="text-[12px] text-ink-500">
            Čistý čas se přičte k času startu → uloží se jako razítko průchodu.
          </p>
        ) : (
          <p className="text-[12px] text-warning">
            Nejdřív nastav čas startu níže — čistý čas se počítá od něj.
          </p>
        ))}
    </form>
  );
}
