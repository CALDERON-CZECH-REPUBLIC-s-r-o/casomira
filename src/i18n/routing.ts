import { defineRouting } from "next-intl/routing";

/**
 * Locale routing: čeština (výchozí, bez prefixu) + angličtina (`/en/...`).
 * `as-needed` = `cs` běží na holých cestách (`/`, `/{slug}`, `/admin`), `en`
 * dostane prefix (`/en`, `/en/{slug}`, `/en/admin`).
 */
export const routing = defineRouting({
  locales: ["cs", "en"],
  defaultLocale: "cs",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
