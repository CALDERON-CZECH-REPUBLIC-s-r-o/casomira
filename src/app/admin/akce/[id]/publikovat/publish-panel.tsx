"use client";

import { useEffect, useState, useTransition } from "react";
import { casDneKratky } from "@/lib/cas";
import { publikovat, obnovitZeZalohy } from "@/server/publikovat";

export function PublishPanel({
  akceId,
  nakonfigurovano,
}: {
  akceId: string;
  nakonfigurovano: boolean;
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={publikuj}
          disabled={!nakonfigurovano || pending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Publikuji…" : "Publikovat teď"}
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={auto}
            disabled={!nakonfigurovano}
            onChange={(e) => setAuto(e.target.checked)}
          />
          Auto-publikovat (à 20 s)
        </label>
        {posledni && (
          <span className="text-xs text-gray-500">
            naposledy {casDneKratky(posledni)}
          </span>
        )}
      </div>
      {stav && !chyba && <p className="text-sm text-green-700">{stav}</p>}
      {chyba && <p className="text-sm text-red-600">{chyba}</p>}
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
        className="text-sm"
      />
      <button
        disabled={pending}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
      >
        {pending ? "Obnovuji…" : "Obnovit ze zálohy"}
      </button>
      {vysledek && <span className="text-sm text-gray-600">{vysledek}</span>}
    </form>
  );
}
