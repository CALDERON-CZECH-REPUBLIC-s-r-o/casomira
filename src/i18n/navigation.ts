import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigace (Link, useRouter, redirect, usePathname). Používej místo
 * `next/link` a `next/navigation` u odkazů na stránky — zachovají aktuální locale.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
