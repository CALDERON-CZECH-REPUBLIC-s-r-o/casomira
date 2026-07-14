"use client";

import { useActionState, useEffect, useState } from "react";
import Script from "next/script";
import {
  registrovatOrganizatora,
  type RegistraceState,
} from "@/server/organizatori";
import { Btn } from "../admin/_components/ui";
import { Link } from "@/i18n/navigation";

export function RegistraceForm({
  turnstileSiteKey,
}: {
  turnstileSiteKey: string | null;
}) {
  const [stav, akce, ceka] = useActionState<RegistraceState, FormData>(
    registrovatOrganizatora,
    { stav: "idle" },
  );
  // Časová past — vyplní se až po mountu (žádný Date.now v renderu).
  const [ts, setTs] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTs(Date.now());
  }, []);

  if (stav.stav === "ok") {
    return (
      <div className="cal-card rounded-[22px] p-6 shadow-xl">
        <div className="mb-2 text-center text-3xl">✓</div>
        <h1 className="mb-2 text-center text-[16px] font-semibold text-ink-800">
          Registrace přijata
        </h1>
        <p className="text-center text-sm text-ink-500">
          Účet čeká na schválení administrátorem. Jakmile ho schválíme, budete se
          moci přihlásit a zakládat závody.
        </p>
        <div className="mt-5 text-center">
          <Link
            href="/prihlaseni"
            className="text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            Zpět na přihlášení
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cal-card rounded-[22px] p-6 shadow-xl">
      <h1 className="mb-1 text-center text-[16px] font-semibold text-ink-800">
        Registrace pořadatele
      </h1>
      <p className="mb-5 text-center text-[13px] text-ink-500">
        Účet podléhá schválení. Po schválení můžete zakládat a měřit závody.
      </p>

      {stav.stav === "chyba" && (
        <p className="mb-4 rounded-[10px] bg-error-bg p-3 text-sm font-medium text-error">
          {stav.zprava}
        </p>
      )}

      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
        />
      )}

      <form action={akce} className="flex flex-col gap-4">
        {/* Honeypot + časová past */}
        <input
          type="text"
          name="web"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <input type="hidden" name="ts" value={ts} />

        <label className="cal-label">
          Jméno a příjmení
          <input name="jmeno" required autoComplete="name" className="cal-input" />
        </label>
        <label className="cal-label">
          E-mail
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="cal-input"
          />
        </label>
        <label className="cal-label">
          Heslo
          <input
            name="heslo"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="cal-input"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="cal-label">
            Firma <span className="text-ink-400">(volitelné)</span>
            <input name="firma" className="cal-input" />
          </label>
          <label className="cal-label">
            IČO <span className="text-ink-400">(volitelné)</span>
            <input name="ico" inputMode="numeric" className="cal-input" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="cal-label">
            DIČ <span className="text-ink-400">(volitelné)</span>
            <input name="dic" className="cal-input" />
          </label>
          <label className="cal-label">
            Telefon <span className="text-ink-400">(volitelné)</span>
            <input name="telefon" type="tel" className="cal-input" />
          </label>
        </div>

        {turnstileSiteKey && (
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
        )}

        <Btn type="submit" disabled={ceka} className="mt-1 w-full">
          {ceka ? "Odesílám…" : "Zaregistrovat se"}
        </Btn>
      </form>

      <div className="mt-5 text-center text-[13px] text-ink-500">
        Už máte účet?{" "}
        <Link
          href="/prihlaseni"
          className="font-semibold text-teal-600 hover:text-teal-700"
        >
          Přihlaste se
        </Link>
      </div>
    </div>
  );
}
