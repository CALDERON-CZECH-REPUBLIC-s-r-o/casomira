"use client";

import { useEffect, useState, useTransition } from "react";
import { casDneKratky } from "@/lib/cas";
import { publikovat, obnovitZeZalohy } from "@/server/publikovat";
import { Btn } from "../../../_components/ui";

export function PublishPanel({
  akceId,
  nakonfigurovano,
  slug,
}: {
  akceId: string;
  nakonfigurovano: boolean;
  slug: string;
}) {
  const [stav, setStav] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [posledni, setPosledni] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [pending, startTransition] = useTransition();

  const publikuj = () => {
    startTransition(async () => {
      const r = await publikovat(akceId);
      if (r.ok) {
        setChyba(null);
        setPosledni(r.kdy ?? new Date().toISOString());
        setStav(`Publikováno (${r.zaznamu ?? 0} průchodů)`);
      } else {
        setChyba(r.chyba ?? "Publikování selhalo.");
      }
    });
  };

  // Auto-publikování à 20 s.
  useEffect(() => {
    if (!auto || !nakonfigurovano) return;
    const i = setInterval(() => {
      publikovat(akceId).then((r) => {
        if (r.ok) {
          setChyba(null);
          setPosledni(r.kdy ?? new Date().toISOString());
          setStav(`Auto-publikováno (${r.zaznamu ?? 0})`);
        } else {
          setChyba(r.chyba ?? "Auto-publikování selhalo.");
        }
      });
    }, 20000);
    return () => clearInterval(i);
  }, [auto, nakonfigurovano, akceId]);

  const chipClass = chyba
    ? "bg-error-bg text-error"
    : stav
      ? "bg-success-bg text-success"
      : "bg-warning-bg text-warning";
  const chipLabel = chyba ? "Chyba" : stav ? "Publikováno" : "Nepublikováno";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Btn onClick={publikuj} disabled={!nakonfigurovano || pending}>
          {pending ? "Publikuji…" : "Publikovat teď"}
        </Btn>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-technical uppercase ${chipClass}`}
        >
          {chipLabel}
        </span>
        {posledni && (
          <span className="font-technical text-xs text-ink-500">
            naposledy {casDneKratky(posledni)}
          </span>
        )}
      </div>

      <label className="flex items-center gap-2.5 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={auto}
          disabled={!nakonfigurovano}
          onChange={(e) => setAuto(e.target.checked)}
          className="h-4 w-4 accent-teal-500"
        />
        Auto-publikovat (à 20 s)
      </label>

      {stav && !chyba && <p className="text-sm text-success">{stav}</p>}
      {chyba && <p className="text-sm text-error">{chyba}</p>}
    </div>

      <div className="flex aspect-square w-32 flex-none items-center justify-center rounded-[10px] border border-ink-200 bg-ink-50 text-center">
        <span className="font-technical text-[10px] text-ink-400">
          QR — /{slug}
        </span>
      </div>
    </div>
  );
}

export function ObnovaForm({ akceId }: { akceId: string }) {
  const [vysledek, setVysledek] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const r = await obnovitZeZalohy(akceId, fd);
          setVysledek(
            r.ok ? `Obnoveno (${r.zaznamu ?? 0} průchodů).` : (r.chyba ?? "Chyba."),
          );
        })
      }
      className="flex flex-wrap items-center gap-3"
    >
      <input
        type="file"
        name="zaloha"
        accept="application/json,.json"
        required
        className="cal-input text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-ink-700"
      />
      <Btn variant="ghost" disabled={pending}>
        {pending ? "Obnovuji…" : "Obnovit ze zálohy"}
      </Btn>
      {vysledek && (
        <span className="font-technical text-sm text-ink-600">{vysledek}</span>
      )}
    </form>
  );
}
