"use client";

import { useActionState } from "react";
import { poslatTestEmail, type TestStav } from "@/server/email";
import { Btn } from "../_components/ui";

export function TestForm() {
  const [stav, akce, ceka] = useActionState<TestStav, FormData>(
    poslatTestEmail,
    { stav: "idle" },
  );
  return (
    <form action={akce} className="flex flex-col gap-3">
      <label className="cal-label">
        Poslat testovací e-mail na
        <div className="flex gap-2">
          <input
            name="komu"
            type="email"
            required
            placeholder="adresa@example.cz"
            className="cal-input font-technical"
          />
          <Btn type="submit" variant="ghost" disabled={ceka}>
            {ceka ? "Odesílám…" : "Odeslat test"}
          </Btn>
        </div>
      </label>
      {stav.stav === "ok" && (
        <p className="rounded-[10px] bg-success-bg p-3 text-sm text-success">
          {stav.zprava}
        </p>
      )}
      {stav.stav === "chyba" && (
        <p className="rounded-[10px] bg-error-bg p-3 text-sm text-error">
          {stav.zprava}
        </p>
      )}
    </form>
  );
}
