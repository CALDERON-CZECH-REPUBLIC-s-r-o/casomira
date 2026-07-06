"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Timer,
  Upload,
  Zap,
  FileText,
  Check,
  Plus,
  Minus,
  Menu,
  X,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { LandingObsah } from "@/lib/landing-obsah";
import { PoweredBy } from "@/app/[locale]/admin/_components/ui";

export type LandingAkce = {
  nazev: string;
  datum: string;
  misto: string | null;
  slug: string;
  bezi: boolean;
};

const IKONY_FUNKCI: LucideIcon[] = [Timer, Upload, Zap, FileText];

const HERO_DLAZDICE: { cislo: string; cas: string | null }[] = [
  { cislo: "7", cas: "17:42" },
  { cislo: "14", cas: "17:49" },
  { cislo: "3", cas: "17:55" },
  { cislo: "21", cas: "18:03" },
  { cislo: "11", cas: null },
  { cislo: "28", cas: "18:19" },
  { cislo: "18", cas: null },
  { cislo: "25", cas: null },
  { cislo: "31", cas: "18:41" },
  { cislo: "34", cas: null },
];

const TABULE_RADKY = [
  { poradi: 1, jmeno: "Jakub Svoboda", cas: "17:42.3" },
  { poradi: 2, jmeno: "Matěj Novák", cas: "17:49.8" },
  { poradi: 3, jmeno: "Tereza Nováková", cas: "17:55.1" },
  { poradi: 4, jmeno: "Vojtěch Procházka", cas: "18:03.5" },
];

const MEDAILE: Record<number, string> = {
  1: "bg-[#E9A23C] text-white",
  2: "bg-ink-300 text-white",
  3: "bg-[#D6A06A] text-white",
};

/** Běžící cílové hodiny v hero mocku (MM:SS, počítá se v prohlížeči). */
function useBezciHodiny(start = 17 * 60 + 51) {
  const [s, setS] = useState(start);
  useEffect(() => {
    const t = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/* ---------- Tlačítka landing (samostatné, ať nezávisí na admin variantách) ---------- */

function Cta({
  href,
  children,
  glow = true,
}: {
  href: string;
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`cal-press inline-flex items-center justify-center gap-2 rounded-full bg-teal-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-600 ${
        glow ? "shadow-[var(--shadow-primary)]" : ""
      }`}
    >
      {children}
    </Link>
  );
}

export function Landing({
  obsah,
  akce,
}: {
  obsah: LandingObsah;
  akce: LandingAkce[];
}) {
  const [faqOtevrena, setFaqOtevrena] = useState(0);
  const [menuOtevrene, setMenuOtevrene] = useState(false);
  const hodiny = useBezciHodiny();
  const napsatDotaz = `mailto:${obsah.kontaktEmail}`;
  const ukazkaHref = akce.length > 0 ? "#zavody" : "#divaci";

  const navOdkazy = [
    { label: obsah.nav.funkce, href: "#funkce" },
    { label: obsah.nav.jak, href: "#jak" },
    { label: obsah.nav.cenik, href: "#cenik" },
    { label: obsah.nav.divaci, href: "#divaci" },
  ];

  return (
    <div className="font-brand min-h-screen bg-white text-ink-900">
      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-50 border-b border-ink-200 bg-[rgba(248,250,249,.92)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" className="flex items-center">
            <Image
              src="/casomir-logo.png"
              alt="Časomír"
              width={1384}
              height={506}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {navOdkazy.map((o) => (
              <a
                key={o.href}
                href={o.href}
                className="text-[13.5px] font-medium text-ink-600 transition-colors hover:text-ink-900"
              >
                {o.label}
              </a>
            ))}
            <Link
              href="/prihlaseni"
              className="text-[13.5px] font-medium text-ink-600 transition-colors hover:text-ink-900"
            >
              {obsah.nav.prihlasit}
            </Link>
            <Cta href="/prihlaseni" glow={false}>
              {obsah.nav.cta}
            </Cta>
          </nav>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMenuOtevrene((v) => !v)}
            className="cal-press flex h-9 w-9 items-center justify-center rounded-[10px] border border-ink-200 text-ink-700 md:hidden"
          >
            {menuOtevrene ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {menuOtevrene && (
          <div className="border-t border-ink-200 bg-white px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {navOdkazy.map((o) => (
                <a
                  key={o.href}
                  href={o.href}
                  onClick={() => setMenuOtevrene(false)}
                  className="rounded-[10px] px-2 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                >
                  {o.label}
                </a>
              ))}
              <Link
                href="/prihlaseni"
                className="rounded-[10px] px-2 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                {obsah.nav.prihlasit}
              </Link>
              <Cta href="/prihlaseni">{obsah.nav.cta}</Cta>
            </nav>
          </div>
        )}
      </header>

      {/* ============ HERO ============ */}
      <section className="cal-dots-dark cal-glow-top bg-ink-950 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="cal-eyebrow text-teal-300">{obsah.hero.eyebrow}</div>
            <h1 className="mt-4 font-display text-[38px] font-extrabold leading-[1.05] tracking-tight text-white md:text-[54px]">
              {obsah.hero.h1a}
              <br />
              {obsah.hero.h1b}
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-300 md:text-[17px]">
              {obsah.hero.sub}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Cta href="/prihlaseni">{obsah.hero.ctaPrimary}</Cta>
              <a
                href={ukazkaHref}
                className="cal-press inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {obsah.hero.ctaSecondary}
              </a>
            </div>
            <p className="mt-5 flex items-center gap-2 text-[12.5px] text-ink-400">
              <span className="cal-livedot h-2 w-2 rounded-full bg-teal-400" />
              {obsah.hero.note}
            </p>
          </div>

          {/* Mini-ukázka číselníku */}
          <div className="rounded-[22px] border border-white/10 bg-ink-900/70 p-5 shadow-[var(--shadow-xl)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="cal-eyebrow text-teal-300">
                  {obsah.hero.mockEyebrow}
                </div>
                <div className="mt-1 text-[13px] font-semibold text-white">
                  {obsah.hero.mockTitul}
                </div>
              </div>
              <div className="rounded-[10px] bg-ink-950 px-3 py-1.5 font-technical text-[22px] font-bold tabular-nums text-teal-300">
                {hodiny}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {HERO_DLAZDICE.map((d, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-center rounded-[10px] border py-2.5 ${
                    d.cas
                      ? "border-teal-500 bg-teal-500/15"
                      : "border-white/12 bg-white/5"
                  }`}
                >
                  <div className="font-technical text-[15px] font-bold tabular-nums text-white">
                    {d.cislo}
                  </div>
                  <div className="mt-0.5 font-technical text-[9px] tabular-nums text-teal-300">
                    {d.cas ?? "—"}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 cal-eyebrow text-ink-400">
              {obsah.hero.mockPaticka}
            </div>
          </div>
        </div>
      </section>

      {/* ============ DŮKAZNÍ PÁS ============ */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3">
          {obsah.dukazy.map((d, i) => (
            <div key={i} className="text-center sm:text-left">
              <div
                className={`font-technical text-[40px] font-extrabold leading-none tabular-nums ${
                  i === 1 ? "text-teal-500" : "text-ink-900"
                }`}
              >
                {d.cislo}
              </div>
              <p className="mx-auto mt-2 max-w-[15rem] text-[13.5px] leading-relaxed text-ink-500 sm:mx-0">
                {d.popis}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FUNKCE ============ */}
      <section id="funkce" className="scroll-mt-20 bg-ink-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="cal-eyebrow text-teal-600">{obsah.funkce.eyebrow}</div>
          <h2 className="mt-2 max-w-lg font-display text-[28px] font-bold tracking-tight text-ink-900">
            {obsah.funkce.h2}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {obsah.funkce.karty.map((k, i) => {
              const Ikona = IKONY_FUNKCI[i] ?? Timer;
              return (
                <div
                  key={i}
                  className="cal-card p-6 shadow-[var(--shadow-sm)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-teal-50 text-teal-600">
                    <Ikona size={22} strokeWidth={1.75} />
                  </span>
                  <div className="mt-4 text-[17px] font-semibold text-ink-900">
                    {k.titul}
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-[1.65] text-ink-500">
                    {k.popis}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ JAK TO FUNGUJE ============ */}
      <section id="jak" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="cal-eyebrow text-teal-600">{obsah.jak.eyebrow}</div>
          <h2 className="mt-2 font-display text-[28px] font-bold tracking-tight text-ink-900">
            {obsah.jak.h2}
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {obsah.jak.kroky.map((k, i) => (
              <div
                key={i}
                className={`rounded-[16px] border p-6 ${
                  i === 1
                    ? "border-teal-300 bg-teal-50/40 shadow-[var(--shadow-md)]"
                    : "border-ink-200 bg-white shadow-[var(--shadow-sm)]"
                }`}
              >
                <div className="font-technical text-[15px] font-bold tabular-nums text-teal-500">
                  {k.cislo}
                </div>
                <div className="mt-3 text-[17px] font-semibold text-ink-900">
                  {k.titul}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-[1.65] text-ink-500">
                  {k.popis}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRO DIVÁKY ============ */}
      <section
        id="divaci"
        className="cal-dots-dark scroll-mt-20 bg-ink-950 text-white"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2">
          <div>
            <div className="cal-eyebrow text-teal-300">{obsah.divaci.eyebrow}</div>
            <h2 className="mt-2 max-w-md font-display text-[28px] font-bold tracking-tight text-white">
              {obsah.divaci.h2}
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-300">
              {obsah.divaci.popis}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
              <span className="cal-livedot h-2 w-2 rounded-full bg-teal-400" />
              <span className="font-technical text-[12.5px] text-teal-200">
                {obsah.divaci.urlPill}
              </span>
            </div>
          </div>
          {/* mini-tabule */}
          <div className="rounded-[22px] border border-white/10 bg-ink-900/70 p-5 shadow-[var(--shadow-xl)]">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-[13px] font-semibold text-white">
                {obsah.hero.mockTitul.split(" · ")[0]}
              </span>
              <span className="cal-eyebrow text-ink-400">živé pořadí</span>
            </div>
            <div className="space-y-1.5">
              {TABULE_RADKY.map((r) => (
                <div
                  key={r.poradi}
                  className="flex items-center gap-3 rounded-[10px] bg-white/5 px-3 py-2"
                >
                  <span
                    className={`flex h-7 w-7 flex-none items-center justify-center rounded-full font-technical text-[12px] font-bold tabular-nums ${
                      MEDAILE[r.poradi] ?? "bg-white/10 text-ink-300"
                    }`}
                  >
                    {r.poradi}
                  </span>
                  <span className="flex-1 text-[13.5px] font-medium text-white">
                    {r.jmeno}
                  </span>
                  <span className="font-technical text-[13px] tabular-nums text-teal-300">
                    {r.cas}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ CENÍK ============ */}
      <section id="cenik" className="scroll-mt-20 bg-ink-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center">
            <div className="cal-eyebrow text-teal-600">{obsah.cenik.eyebrow}</div>
            <h2 className="mt-2 font-display text-[28px] font-bold tracking-tight text-ink-900">
              {obsah.cenik.h2}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-ink-500">
              {obsah.cenik.uvod}
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {obsah.cenik.tarify.map((t, i) => {
              const zvyraznit = !!t.badge;
              return (
                <div
                  key={i}
                  className={`relative flex flex-col rounded-[18px] border bg-white p-6 ${
                    zvyraznit
                      ? "border-teal-400 shadow-[var(--shadow-lg)]"
                      : "border-ink-200 shadow-[var(--shadow-sm)]"
                  }`}
                >
                  {t.badge && (
                    <span className="absolute -top-3 left-6 rounded-full bg-teal-500 px-3 py-1 font-technical text-[9.5px] font-semibold uppercase tracking-[.1em] text-white shadow-[var(--shadow-primary)]">
                      {t.badge}
                    </span>
                  )}
                  <div className="text-[15px] font-semibold text-ink-900">
                    {t.nazev}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-display text-[30px] font-extrabold tracking-tight text-ink-900">
                      {t.cena}
                    </span>
                    <span className="font-technical text-[12px] text-ink-400">
                      {t.obdobi}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-ink-500">{t.popis}</p>
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {t.polozky.map((p, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-[13px] text-ink-700">
                        <Check
                          size={16}
                          strokeWidth={2.2}
                          className="mt-0.5 flex-none text-teal-600"
                        />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/prihlaseni"
                    className={`cal-press mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                      zvyraznit
                        ? "bg-teal-500 text-white shadow-[var(--shadow-primary)] hover:bg-teal-600"
                        : "border border-ink-200 text-ink-800 hover:bg-ink-100"
                    }`}
                  >
                    {t.cta}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="mx-auto mt-6 max-w-xl text-center text-[12.5px] text-ink-400">
            {obsah.cenik.poznamka}
          </p>
        </div>
      </section>

      {/* ============ ŽIVÉ ZÁVODY (reálná data) ============ */}
      {akce.length > 0 && (
        <section id="zavody" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div className="cal-eyebrow text-teal-600">Živé závody</div>
            <h2 className="mt-2 font-display text-[28px] font-bold tracking-tight text-ink-900">
              Výsledky a startovní listiny
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {akce.map((a) => (
                <Link
                  key={a.slug}
                  href={`/${a.slug}`}
                  className="cal-card group flex items-center justify-between gap-4 p-5 shadow-[var(--shadow-sm)] transition-colors hover:border-teal-300"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-ink-900 group-hover:text-teal-700">
                        {a.nazev}
                      </span>
                      {a.bezi && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-technical text-[9.5px] font-semibold uppercase tracking-[.08em] text-teal-700">
                          <span className="cal-livedot h-1.5 w-1.5 rounded-full bg-teal-500" />
                          živě
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-technical text-[12px] tabular-nums text-ink-500">
                      {a.datum}
                      {a.misto ? ` · ${a.misto}` : ""}
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    className="flex-none text-ink-300 transition-colors group-hover:text-teal-600"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ FAQ ============ */}
      <section className="bg-ink-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[minmax(0,1fr)_1.4fr]">
          <div>
            <div className="cal-eyebrow text-teal-600">{obsah.faq.eyebrow}</div>
            <h2 className="mt-2 font-display text-[28px] font-bold tracking-tight text-ink-900">
              {obsah.faq.h2}
            </h2>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-ink-500">
              {obsah.faq.popis}
            </p>
            <a
              href={napsatDotaz}
              className="cal-press mt-5 inline-flex items-center justify-center rounded-full border border-ink-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-800 transition-colors hover:bg-ink-100"
            >
              {obsah.faq.cta}
            </a>
          </div>
          <div className="space-y-3">
            {obsah.faq.polozky.map((p, i) => {
              const otevrena = faqOtevrena === i;
              return (
                <div
                  key={i}
                  className={`overflow-hidden rounded-[16px] border bg-white transition-colors ${
                    otevrena ? "border-teal-300" : "border-ink-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setFaqOtevrena(otevrena ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span
                      className={`text-[14.5px] font-semibold ${
                        otevrena ? "text-teal-700" : "text-ink-900"
                      }`}
                    >
                      {p.otazka}
                    </span>
                    <span
                      className={`flex h-6 w-6 flex-none items-center justify-center rounded-full ${
                        otevrena ? "bg-teal-500 text-white" : "bg-teal-50 text-teal-600"
                      }`}
                    >
                      {otevrena ? <Minus size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                  {otevrena && (
                    <p className="px-5 pb-5 text-[13.5px] leading-[1.65] text-ink-600">
                      {p.odpoved}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="cal-dots bg-white">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="font-display text-[30px] font-bold tracking-tight text-ink-900 md:text-[34px]">
            {obsah.ctaFinal.h2}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-500">
            {obsah.ctaFinal.popis}
          </p>
          <div className="mt-8 flex justify-center">
            <Cta href="/prihlaseni">{obsah.ctaFinal.cta}</Cta>
          </div>
        </div>
      </section>

      {/* ============ PATIČKA ============ */}
      <footer className="border-t border-ink-200 bg-ink-950 text-ink-300">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row">
          <Image
            src="/casomir-logo-dark.png"
            alt="Časomír"
            width={1384}
            height={506}
            className="h-8 w-auto"
          />
          <nav className="flex items-center gap-6 text-[13px]">
            <a href="#funkce" className="transition-colors hover:text-white">
              {obsah.paticka.dokumentace}
            </a>
            <a href={napsatDotaz} className="transition-colors hover:text-white">
              {obsah.paticka.kontakt}
            </a>
            <a href="#cenik" className="transition-colors hover:text-white">
              {obsah.paticka.podminky}
            </a>
          </nav>
          <PoweredBy variant="dark" />
        </div>
      </footer>
    </div>
  );
}
