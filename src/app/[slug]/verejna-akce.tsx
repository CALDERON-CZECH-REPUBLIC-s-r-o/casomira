"use client";

import { useEffect, useState } from "react";
import { cistyCas, ztrata, casDneKratky } from "@/lib/cas";
import type {
  VerejnaData,
  VerejnaSkupina,
  VerejnyRadek,
  VerejnyStartRadek,
} from "@/lib/verejna-data";

const STAV_LABEL: Record<string, string> = {
  DNF: "DNF",
  DNS: "DNS",
  DSQ: "DSQ",
};

function casBunka(r: VerejnyRadek, bezi: boolean): string {
  if (r.stav === "klasifikovan" && r.casMs !== null) return cistyCas(r.casMs);
  if (r.stav === "bez_casu") return bezi ? "na trati" : "—";
  return STAV_LABEL[r.stav] ?? "—";
}

export function VerejnaAkce({
  slug,
  initial,
}: {
  slug: string;
  initial: VerejnaData;
}) {
  const [data, setData] = useState<VerejnaData>(initial);
  const [tab, setTab] = useState<"vysledky" | "startovka">("vysledky");
  const [rozsah, setRozsah] = useState<"kategorie" | "celkova">("kategorie");
  const [zive, setZive] = useState(true);

  // Polling à 5 s, jen když je akce „živá" (běží měření).
  useEffect(() => {
    if (!data.akce.bezi) return;
    let zruseno = false;
    const tik = async () => {
      try {
        const r = await fetch(`/api/verejne/${slug}`, { cache: "no-store" });
        if (!r.ok) throw new Error();
        const nova = (await r.json()) as VerejnaData;
        if (!zruseno) {
          setData(nova);
          setZive(true);
        }
      } catch {
        if (!zruseno) setZive(false);
      }
    };
    const i = setInterval(tik, 5000);
    return () => {
      zruseno = true;
      clearInterval(i);
    };
  }, [slug, data.akce.bezi]);

  const a = data.akce;
  const d = new Date(a.datum + "T00:00:00");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">{a.nazev}</h1>
        <p className="text-sm text-gray-600">
          {`${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`}
          {a.misto ? ` · ${a.misto}` : ""}
        </p>
        {a.bezi ? (
          <p className="mt-1 text-xs">
            <span className={zive ? "text-green-600" : "text-amber-600"}>
              ● {zive ? "živě" : "offline"}
            </span>{" "}
            <span className="text-gray-400">
              · aktualizováno {casDneKratky(a.aktualizovano)}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">závod ještě nezačal</p>
        )}
      </header>

      {/* Taby */}
      <div className="mb-3 flex gap-2 border-b">
        <TabBtn aktivni={tab === "vysledky"} onClick={() => setTab("vysledky")}>
          Výsledky
        </TabBtn>
        <TabBtn aktivni={tab === "startovka"} onClick={() => setTab("startovka")}>
          Startovní listina
        </TabBtn>
      </div>

      {/* Přepínač rozsahu */}
      <div className="mb-4 flex gap-2 text-sm">
        <RozsahBtn aktivni={rozsah === "kategorie"} onClick={() => setRozsah("kategorie")}>
          po kategoriích
        </RozsahBtn>
        <RozsahBtn aktivni={rozsah === "celkova"} onClick={() => setRozsah("celkova")}>
          celkově
        </RozsahBtn>
      </div>

      {tab === "vysledky" ? (
        rozsah === "celkova" ? (
          <VysledkySkupina skupina={data.vysledky.celkova} bezi={a.bezi} celkova />
        ) : data.vysledky.kategorie.length === 0 ? (
          <Prazdno text="Zatím žádné výsledky." />
        ) : (
          data.vysledky.kategorie.map((sk) => (
            <VysledkySkupina key={sk.kod ?? sk.nazev} skupina={sk} bezi={a.bezi} />
          ))
        )
      ) : rozsah === "celkova" ? (
        <StartTabulka zavodnici={data.startovni.celkova} sKategorii />
      ) : data.startovni.kategorie.length === 0 ? (
        <Prazdno text="Žádní přihlášení." />
      ) : (
        data.startovni.kategorie.map((k) => (
          <section key={k.kod ?? k.nazev} className="mb-5">
            <h2 className="mb-1 border-b border-gray-300 pb-0.5 font-semibold">
              {k.kod ? `${k.kod} — ` : ""}
              {k.nazev}
            </h2>
            <StartTabulka zavodnici={k.zavodnici} />
          </section>
        ))
      )}

      <footer className="mt-10 text-center text-xs text-gray-400">
        Časomíra · výsledky online
      </footer>
    </main>
  );
}

function VysledkySkupina({
  skupina,
  bezi,
  celkova,
}: {
  skupina: VerejnaSkupina;
  bezi: boolean;
  celkova?: boolean;
}) {
  if (skupina.radky.length === 0) return null;
  return (
    <section className="mb-5">
      {!celkova && (
        <h2 className="mb-1 border-b border-gray-300 pb-0.5 font-semibold">
          {skupina.kod ? `${skupina.kod} — ` : ""}
          {skupina.nazev}
          <span className="ml-2 text-xs font-normal text-gray-500">
            {skupina.klasifikovano} klasifikováno
            {skupina.dnf ? ` · ${skupina.dnf} DNF` : ""}
          </span>
        </h2>
      )}
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-gray-500">
          <tr className="border-b">
            <th className="py-1 pr-1">Poř.</th>
            <th className="pr-1">Č.</th>
            <th className="pr-1">Jméno</th>
            <th className="hidden pr-1 sm:table-cell">Roč.</th>
            <th className="hidden pr-1 sm:table-cell">Oddíl / Město</th>
            <th className="pr-1 text-right">Čas</th>
            <th className="pr-1 text-right">Ztráta</th>
          </tr>
        </thead>
        <tbody>
          {skupina.radky.map((r) => {
            const nedobehl = r.stav !== "klasifikovan";
            return (
              <tr
                key={r.id}
                className={`border-b last:border-0 ${nedobehl ? "text-gray-400" : ""}`}
              >
                <td className="py-1 pr-1 tabular-nums">{r.poradi ?? ""}</td>
                <td className="pr-1 tabular-nums">{r.cislo ?? "—"}</td>
                <td className="pr-1">
                  <span className="font-medium">{r.prijmeni}</span> {r.jmeno}
                </td>
                <td className="hidden pr-1 tabular-nums sm:table-cell">
                  {r.rocnik ?? "—"}
                </td>
                <td className="hidden pr-1 sm:table-cell">{r.oddil || "—"}</td>
                <td className="pr-1 text-right tabular-nums">
                  {casBunka(r, bezi)}
                </td>
                <td className="pr-1 text-right tabular-nums text-gray-500">
                  {r.stav === "klasifikovan" ? ztrata(r.ztrataMs) : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function StartTabulka({
  zavodnici,
  sKategorii,
}: {
  zavodnici: VerejnyStartRadek[];
  sKategorii?: boolean;
}) {
  return (
    <table className="mb-4 w-full text-sm">
      <thead className="text-left text-xs text-gray-500">
        <tr className="border-b">
          <th className="py-1 pr-1">Č.</th>
          <th className="pr-1">Jméno</th>
          <th className="hidden pr-1 sm:table-cell">Roč.</th>
          <th className="pr-1">Oddíl / Město</th>
          {sKategorii && <th className="pr-1">Kat.</th>}
        </tr>
      </thead>
      <tbody>
        {zavodnici.map((z) => (
          <tr key={z.id} className="border-b last:border-0">
            <td className="py-1 pr-1 tabular-nums">{z.cislo ?? "—"}</td>
            <td className="pr-1">
              <span className="font-medium">{z.prijmeni}</span> {z.jmeno}
            </td>
            <td className="hidden pr-1 tabular-nums sm:table-cell">
              {z.rocnik ?? "—"}
            </td>
            <td className="pr-1">{z.oddil || "—"}</td>
            {sKategorii && <td className="pr-1">{z.kategorieKod ?? "—"}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabBtn({
  aktivni,
  onClick,
  children,
}: {
  aktivni: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        aktivni
          ? "border-black text-black"
          : "border-transparent text-gray-500"
      }`}
    >
      {children}
    </button>
  );
}

function RozsahBtn({
  aktivni,
  onClick,
  children,
}: {
  aktivni: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 ${
        aktivni ? "bg-black text-white" : "bg-gray-100 text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

function Prazdno({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-gray-400">{text}</p>;
}
