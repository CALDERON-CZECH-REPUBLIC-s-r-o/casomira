"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Přepínač jazyka CS | EN. Zachová aktuální cestu a přepne jen locale
 * (přes next-intl navigaci → URL prefix `/en`). Mono pill, aktivní = teal.
 */
export function LangToggle({
  variant = "light",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const wrap =
    variant === "dark"
      ? "border-white/15 bg-white/5"
      : "border-ink-200 bg-ink-100";
  const inactive =
    variant === "dark"
      ? "text-ink-300 hover:text-white"
      : "text-ink-500 hover:text-ink-900";

  return (
    <div
      className={`inline-flex rounded-full border p-0.5 ${wrap} ${className}`}
    >
      {routing.locales.map((l) => {
        const je = l === locale;
        return (
          <button
            key={l}
            type="button"
            aria-pressed={je}
            onClick={() => {
              if (!je) router.replace(pathname, { locale: l });
            }}
            className={`rounded-full px-2 py-0.5 font-technical text-[10.5px] font-semibold uppercase tracking-[.08em] transition-colors ${
              je ? "bg-teal-500 text-white" : inactive
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
