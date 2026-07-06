"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import type { LandingObsah } from "@/lib/landing-obsah";
import { ulozitLandingObsah } from "@/server/obsah";
import { Btn } from "../_components/ui";

/* ---------- Drobné pole ---------- */

function Pole({
  label,
  value,
  onChange,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="cal-label">
      {label}
      <input
        className={`cal-input ${mono ? "font-technical" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Oblast({
  label,
  value,
  onChange,
  rows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="cal-label">
      {label}
      {hint && <span className="text-[11px] font-normal text-ink-400">{hint}</span>}
      <textarea
        className="cal-input resize-y leading-relaxed"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Sekce({ titul, children }: { titul: string; children: ReactNode }) {
  return (
    <section className="cal-card p-5">
      <h2 className="cal-eyebrow mb-4 text-teal-600">{titul}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

/* ---------- Formulář ---------- */

export function ObsahForm({
  vychozi,
  locale,
}: {
  vychozi: LandingObsah;
  locale: string;
}) {
  const [o, setO] = useState<LandingObsah>(vychozi);
  const [ulozeno, setUlozeno] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Immutable úprava: naklonuj, zmutuj draft, ulož.
  function uprav(fn: (draft: LandingObsah) => void) {
    setUlozeno(false);
    setO((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }

  function ulozit() {
    setChyba(null);
    startTransition(async () => {
      try {
        await ulozitLandingObsah(locale, o);
        setUlozeno(true);
      } catch {
        setChyba("Uložení se nezdařilo. Zkuste to znovu.");
      }
    });
  }

  return (
    <div className="grid gap-5 pb-24">
      <Sekce titul="Kontakt">
        <Pole
          label="Kontaktní e-mail (tlačítka „Napsat dotaz“ / „Kontakt“)"
          value={o.kontaktEmail}
          mono
          onChange={(v) => uprav((d) => (d.kontaktEmail = v))}
        />
      </Sekce>

      <Sekce titul="Navigace">
        <div className="grid gap-4 sm:grid-cols-2">
          <Pole label="Funkce" value={o.nav.funkce} onChange={(v) => uprav((d) => (d.nav.funkce = v))} />
          <Pole label="Jak to funguje" value={o.nav.jak} onChange={(v) => uprav((d) => (d.nav.jak = v))} />
          <Pole label="Ceník" value={o.nav.cenik} onChange={(v) => uprav((d) => (d.nav.cenik = v))} />
          <Pole label="Pro diváky" value={o.nav.divaci} onChange={(v) => uprav((d) => (d.nav.divaci = v))} />
          <Pole label="Přihlásit se" value={o.nav.prihlasit} onChange={(v) => uprav((d) => (d.nav.prihlasit = v))} />
          <Pole label="Tlačítko (CTA)" value={o.nav.cta} onChange={(v) => uprav((d) => (d.nav.cta = v))} />
        </div>
      </Sekce>

      <Sekce titul="Hero (úvodní blok)">
        <Pole label="Eyebrow (mono nadpisek)" value={o.hero.eyebrow} onChange={(v) => uprav((d) => (d.hero.eyebrow = v))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Pole label="Nadpis — 1. řádek" value={o.hero.h1a} onChange={(v) => uprav((d) => (d.hero.h1a = v))} />
          <Pole label="Nadpis — 2. řádek" value={o.hero.h1b} onChange={(v) => uprav((d) => (d.hero.h1b = v))} />
        </div>
        <Oblast label="Podtitul" value={o.hero.sub} onChange={(v) => uprav((d) => (d.hero.sub = v))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Pole label="Hlavní tlačítko" value={o.hero.ctaPrimary} onChange={(v) => uprav((d) => (d.hero.ctaPrimary = v))} />
          <Pole label="Vedlejší tlačítko" value={o.hero.ctaSecondary} onChange={(v) => uprav((d) => (d.hero.ctaSecondary = v))} />
        </div>
        <Oblast label="Poznámka pod tlačítky" value={o.hero.note} rows={2} onChange={(v) => uprav((d) => (d.hero.note = v))} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Pole label="Ukázka — eyebrow" value={o.hero.mockEyebrow} onChange={(v) => uprav((d) => (d.hero.mockEyebrow = v))} />
          <Pole label="Ukázka — titul" value={o.hero.mockTitul} onChange={(v) => uprav((d) => (d.hero.mockTitul = v))} />
          <Pole label="Ukázka — patička" value={o.hero.mockPaticka} onChange={(v) => uprav((d) => (d.hero.mockPaticka = v))} />
        </div>
      </Sekce>

      <Sekce titul="Důkazní pás (3 čísla)">
        {o.dukazy.map((d, i) => (
          <div key={i} className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <Pole label={`Číslo ${i + 1}`} value={d.cislo} mono onChange={(v) => uprav((x) => (x.dukazy[i].cislo = v))} />
            <Oblast label="Popis" value={d.popis} rows={2} onChange={(v) => uprav((x) => (x.dukazy[i].popis = v))} />
          </div>
        ))}
      </Sekce>

      <Sekce titul="Funkce">
        <Pole label="Eyebrow" value={o.funkce.eyebrow} onChange={(v) => uprav((d) => (d.funkce.eyebrow = v))} />
        <Pole label="Nadpis" value={o.funkce.h2} onChange={(v) => uprav((d) => (d.funkce.h2 = v))} />
        <div className="grid gap-4 sm:grid-cols-2">
          {o.funkce.karty.map((k, i) => (
            <div key={i} className="grid gap-3 rounded-[12px] border border-ink-150 p-4">
              <Pole label={`Karta ${i + 1} — titul`} value={k.titul} onChange={(v) => uprav((x) => (x.funkce.karty[i].titul = v))} />
              <Oblast label="Popis" value={k.popis} rows={3} onChange={(v) => uprav((x) => (x.funkce.karty[i].popis = v))} />
            </div>
          ))}
        </div>
      </Sekce>

      <Sekce titul="Jak to funguje">
        <Pole label="Eyebrow" value={o.jak.eyebrow} onChange={(v) => uprav((d) => (d.jak.eyebrow = v))} />
        <Pole label="Nadpis" value={o.jak.h2} onChange={(v) => uprav((d) => (d.jak.h2 = v))} />
        {o.jak.kroky.map((k, i) => (
          <div key={i} className="grid gap-3 rounded-[12px] border border-ink-150 p-4 sm:grid-cols-[100px_1fr_1.6fr]">
            <Pole label="Číslo" value={k.cislo} mono onChange={(v) => uprav((x) => (x.jak.kroky[i].cislo = v))} />
            <Pole label="Titul" value={k.titul} onChange={(v) => uprav((x) => (x.jak.kroky[i].titul = v))} />
            <Oblast label="Popis" value={k.popis} rows={2} onChange={(v) => uprav((x) => (x.jak.kroky[i].popis = v))} />
          </div>
        ))}
      </Sekce>

      <Sekce titul="Pro diváky">
        <Pole label="Eyebrow" value={o.divaci.eyebrow} onChange={(v) => uprav((d) => (d.divaci.eyebrow = v))} />
        <Pole label="Nadpis" value={o.divaci.h2} onChange={(v) => uprav((d) => (d.divaci.h2 = v))} />
        <Oblast label="Popis" value={o.divaci.popis} onChange={(v) => uprav((d) => (d.divaci.popis = v))} />
        <Pole label="Ukázková URL (pill)" value={o.divaci.urlPill} mono onChange={(v) => uprav((d) => (d.divaci.urlPill = v))} />
      </Sekce>

      <Sekce titul="Ceník">
        <Pole label="Eyebrow" value={o.cenik.eyebrow} onChange={(v) => uprav((d) => (d.cenik.eyebrow = v))} />
        <Pole label="Nadpis" value={o.cenik.h2} onChange={(v) => uprav((d) => (d.cenik.h2 = v))} />
        <Oblast label="Úvod" value={o.cenik.uvod} rows={2} onChange={(v) => uprav((d) => (d.cenik.uvod = v))} />
        <div className="grid gap-4 lg:grid-cols-3">
          {o.cenik.tarify.map((t, i) => (
            <div key={i} className="grid gap-3 rounded-[12px] border border-ink-150 p-4">
              <Pole label={`Tarif ${i + 1} — název`} value={t.nazev} onChange={(v) => uprav((x) => (x.cenik.tarify[i].nazev = v))} />
              <div className="grid grid-cols-2 gap-3">
                <Pole label="Cena" value={t.cena} mono onChange={(v) => uprav((x) => (x.cenik.tarify[i].cena = v))} />
                <Pole label="Období" value={t.obdobi} onChange={(v) => uprav((x) => (x.cenik.tarify[i].obdobi = v))} />
              </div>
              <Pole label="Popis" value={t.popis} onChange={(v) => uprav((x) => (x.cenik.tarify[i].popis = v))} />
              <Pole label="Odznak (prázdné = žádný)" value={t.badge} onChange={(v) => uprav((x) => (x.cenik.tarify[i].badge = v))} />
              <Oblast
                label="Položky"
                hint="jedna položka na řádek"
                rows={4}
                value={t.polozky.join("\n")}
                onChange={(v) =>
                  uprav((x) => (x.cenik.tarify[i].polozky = v.split("\n").map((s) => s.trim()).filter(Boolean)))
                }
              />
              <Pole label="Tlačítko" value={t.cta} onChange={(v) => uprav((x) => (x.cenik.tarify[i].cta = v))} />
            </div>
          ))}
        </div>
        <Oblast label="Poznámka pod ceníkem" value={o.cenik.poznamka} rows={2} onChange={(v) => uprav((d) => (d.cenik.poznamka = v))} />
      </Sekce>

      <Sekce titul="Časté dotazy (FAQ)">
        <Pole label="Eyebrow" value={o.faq.eyebrow} onChange={(v) => uprav((d) => (d.faq.eyebrow = v))} />
        <Pole label="Nadpis" value={o.faq.h2} onChange={(v) => uprav((d) => (d.faq.h2 = v))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Oblast label="Popis vlevo" value={o.faq.popis} rows={2} onChange={(v) => uprav((d) => (d.faq.popis = v))} />
          <Pole label="Tlačítko" value={o.faq.cta} onChange={(v) => uprav((d) => (d.faq.cta = v))} />
        </div>
        {o.faq.polozky.map((p, i) => (
          <div key={i} className="grid gap-3 rounded-[12px] border border-ink-150 p-4">
            <Pole label={`Otázka ${i + 1}`} value={p.otazka} onChange={(v) => uprav((x) => (x.faq.polozky[i].otazka = v))} />
            <Oblast label="Odpověď" value={p.odpoved} rows={3} onChange={(v) => uprav((x) => (x.faq.polozky[i].odpoved = v))} />
          </div>
        ))}
      </Sekce>

      <Sekce titul="Závěrečná výzva">
        <Pole label="Nadpis" value={o.ctaFinal.h2} onChange={(v) => uprav((d) => (d.ctaFinal.h2 = v))} />
        <Oblast label="Popis" value={o.ctaFinal.popis} rows={2} onChange={(v) => uprav((d) => (d.ctaFinal.popis = v))} />
        <Pole label="Tlačítko" value={o.ctaFinal.cta} onChange={(v) => uprav((d) => (d.ctaFinal.cta = v))} />
      </Sekce>

      <Sekce titul="Patička (odkazy)">
        <div className="grid gap-4 sm:grid-cols-3">
          <Pole label="Odkaz 1" value={o.paticka.dokumentace} onChange={(v) => uprav((d) => (d.paticka.dokumentace = v))} />
          <Pole label="Odkaz 2" value={o.paticka.kontakt} onChange={(v) => uprav((d) => (d.paticka.kontakt = v))} />
          <Pole label="Odkaz 3" value={o.paticka.podminky} onChange={(v) => uprav((d) => (d.paticka.podminky = v))} />
        </div>
      </Sekce>

      {/* Sticky lišta uložení */}
      <div className="sticky bottom-0 z-10 -mx-6 flex items-center justify-between gap-4 border-t border-ink-200 bg-[rgba(248,250,249,.95)] px-6 py-3 backdrop-blur">
        <div className="text-[13px]">
          {chyba ? (
            <span className="font-medium text-error">{chyba}</span>
          ) : ulozeno ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <Check size={15} /> Uloženo — landing je aktualizovaná
            </span>
          ) : (
            <span className="text-ink-400">Změny se projeví na veřejné stránce po uložení.</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-teal-600 hover:text-teal-700"
          >
            Náhled <ExternalLink size={14} />
          </Link>
          <Btn onClick={ulozit} disabled={pending}>
            {pending ? "Ukládám…" : "Uložit texty"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
