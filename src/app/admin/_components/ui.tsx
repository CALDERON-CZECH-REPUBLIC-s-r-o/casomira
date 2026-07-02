import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Sdílené UI primitivy administrace v Calderon designu. Barvy/fonty jdou přes
 * Tailwind utility napojené na tokeny v globals.css (viz @theme). Cílem je držet
 * admin screeny konzistentní s měřicí obrazovkou bez zdi inline stylů.
 */

type Variant = "primary" | "dark" | "ghost" | "danger";

const btnBase =
  "cal-press inline-flex items-center justify-center gap-2 rounded-[10px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-teal-500 px-4 py-2 text-white shadow-[var(--shadow-primary)] hover:bg-teal-600",
  dark: "bg-ink-900 px-4 py-2 text-white hover:bg-ink-800",
  ghost:
    "border border-ink-200 bg-white px-4 py-2 text-ink-700 hover:bg-ink-100",
  danger: "px-3 py-1.5 text-error hover:bg-error-bg",
};

export function Btn({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button className={`${btnBase} ${variants[variant]} ${className}`} {...props} />
  );
}

export function BtnLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link className={`${btnBase} ${variants[variant]} ${className}`} {...props} />
  );
}

export function Card({
  className = "",
  ...props
}: ComponentProps<"div">) {
  return <div className={`cal-card ${className}`} {...props} />;
}

/** Odkaz zpět (breadcrumb) v horní části stránky. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-technical text-[11px] uppercase tracking-[.08em] text-ink-500 transition-colors hover:text-ink-800"
    >
      ← {children}
    </Link>
  );
}

/** Hlavička stránky: volitelný breadcrumb + eyebrow + titul + akce vpravo. */
export function PageHeader({
  back,
  eyebrow,
  title,
  desc,
  actions,
}: {
  back?: { href: string; label: string };
  eyebrow?: string;
  title: string;
  desc?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <div className="mb-3">
          <BackLink href={back.href}>{back.label}</BackLink>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="cal-eyebrow mb-1 text-teal-600">{eyebrow}</div>}
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
          {desc && <div className="mt-1.5 text-sm text-ink-500">{desc}</div>}
        </div>
        {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
