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

/* ---------- Pill / badge ---------- */

type PillTon = "success" | "warning" | "error" | "info" | "teal" | "ink";

const pillTony: Record<PillTon, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  error: "bg-error-bg text-error",
  info: "bg-info-bg text-info",
  teal: "bg-teal-50 text-teal-700",
  ink: "bg-ink-100 text-ink-500",
};

/** Stavová pilulka (PLATNÝ, DNF, ONLINE…). `dot` přidá barevnou tečku. */
export function Pill({
  ton = "ink",
  dot = false,
  className = "",
  children,
}: {
  ton?: PillTon;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-technical text-[10.5px] font-medium uppercase tracking-[.06em] ${pillTony[ton]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------- Metrická karta ---------- */

/** Karta s velkou mono hodnotou a mono labelem. `zvyraznit` = inverzní ink-950. */
export function MetricCard({
  label,
  value,
  sub,
  zvyraznit = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  zvyraznit?: boolean;
}) {
  return (
    <div
      className={`rounded-[16px] border p-4 ${
        zvyraznit
          ? "border-ink-800 bg-ink-950"
          : "border-ink-200 bg-white shadow-[var(--shadow-sm)]"
      }`}
    >
      <div
        className={`cal-eyebrow ${zvyraznit ? "text-teal-300" : "text-ink-400"}`}
      >
        {label}
      </div>
      <div
        className={`mt-1.5 font-technical text-[30px] font-bold leading-none tabular-nums ${
          zvyraznit ? "text-teal-300" : "text-ink-900"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`mt-1 text-[12px] ${zvyraznit ? "text-ink-300" : "text-ink-500"}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/* ---------- Stepper (kroky wizardu) ---------- */

export function Stepper({
  kroky,
  aktivni,
}: {
  kroky: string[];
  aktivni: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {kroky.map((k, i) => {
        const hotovo = i < aktivni;
        const je = i === aktivni;
        return (
          <div key={k} className="flex items-center gap-2">
            <span
              className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[12px] font-semibold ${
                je
                  ? "bg-teal-500 text-white shadow-[var(--shadow-primary)]"
                  : hotovo
                    ? "bg-teal-50 text-teal-700"
                    : "border border-ink-250 bg-white text-ink-400"
              }`}
            >
              {hotovo ? "✓" : i + 1}
            </span>
            <span
              className={`text-[13px] font-medium ${je ? "text-ink-900" : "text-ink-400"}`}
            >
              {k}
            </span>
            {i < kroky.length - 1 && (
              <span className="mx-1 h-px w-6 bg-ink-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Medailové kolečko (pořadí) ---------- */

const medaile: Record<number, string> = {
  1: "bg-[#E9A23C] text-white",
  2: "bg-[#B6C1BC] text-white",
  3: "bg-[#D6A06A] text-white",
};

/** Kolečko s pořadím; 1./2./3. dostanou medailovou barvu, ostatní neutrál. */
export function MedalCircle({ poradi }: { poradi: number | null }) {
  const cls = poradi && medaile[poradi] ? medaile[poradi] : "bg-ink-100 text-ink-600";
  return (
    <span
      className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-full font-technical text-[13px] font-bold tabular-nums ${cls}`}
    >
      {poradi ?? "—"}
    </span>
  );
}

/* ---------- Prázdný stav ---------- */

/** Prázdný stav: Lucide ikona v teal ringu + nadpis + popis + akce. */
export function EmptyState({
  icon,
  title,
  desc,
  actions,
}: {
  icon: ReactNode;
  title: string;
  desc?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="cal-dots flex flex-col items-center rounded-[16px] border border-ink-200 bg-white px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-teal-600">
        {icon}
      </span>
      <h2 className="mt-5 font-display text-xl font-bold text-ink-900">{title}</h2>
      {desc && <p className="mt-2 max-w-sm text-sm text-ink-500">{desc}</p>}
      {actions && <div className="mt-6 flex items-center gap-3">{actions}</div>}
    </div>
  );
}
