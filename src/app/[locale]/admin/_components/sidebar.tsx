"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Tags,
  Users,
  ClipboardList,
  Timer,
  Wrench,
  FileText,
  UploadCloud,
  Settings,
  MapPin,
  Mic,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

interface NavPolozka {
  label: string;
  segment: string; // "" = detail akce
  icon: LucideIcon;
  externi?: boolean; // mimo sidebar chrome (focus/kiosk)
}

const NAV: NavPolozka[] = [
  { label: "Detail akce", segment: "", icon: LayoutDashboard },
  { label: "Kategorie", segment: "kategorie", icon: Tags },
  { label: "Závodníci", segment: "zavodnici", icon: Users },
  { label: "Přihlášky", segment: "prihlasky", icon: ClipboardList },
  { label: "Měření", segment: "mereni", icon: Timer, externi: true },
  { label: "Měřicí body", segment: "brany", icon: MapPin },
  { label: "Opravy", segment: "opravy", icon: Wrench },
  { label: "Konflikty", segment: "konflikty", icon: AlertTriangle },
  { label: "Listiny", segment: "listiny", icon: FileText },
  { label: "Moderátor", segment: "moderator", icon: Mic, externi: true },
  { label: "Publikování", segment: "publikovat", icon: UploadCloud },
  { label: "Nastavení", segment: "nastaveni", icon: Settings },
];

/**
 * Tmavý levý sidebar admin obrazovek akce (Calderon 2d). Aktivní položka dle
 * cesty; „externí" (měření/moderátor) odkazují na focus/kiosk režim.
 */
export function AkceSidebar({
  akceId,
  nazev,
  uzivatel,
}: {
  akceId: string;
  nazev: string;
  uzivatel?: string;
}) {
  const pathname = usePathname();
  const base = `/admin/akce/${akceId}`;

  return (
    <aside className="sticky top-0 flex h-screen w-[236px] flex-none flex-col bg-ink-950 text-ink-300">
      <div className="flex items-center gap-2 px-5 py-5">
        <Image
          src="/casomir-mark-dark.png"
          alt="Časomír"
          width={30}
          height={28}
          style={{ height: 28, width: "auto" }}
          priority
        />
        <span className="font-display text-[15px] font-bold text-white">
          Časomír
        </span>
      </div>

      <Link
        href="/admin"
        className="mx-3 mb-2 block rounded-[10px] px-3 py-2 transition-colors hover:bg-white/5"
      >
        <div className="cal-eyebrow text-teal-400">Akce</div>
        <div className="mt-0.5 truncate text-[13.5px] font-semibold text-white">
          {nazev}
        </div>
      </Link>

      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {NAV.map((p) => {
          const href = p.segment ? `${base}/${p.segment}` : base;
          const aktivni =
            p.segment === ""
              ? pathname === base
              : pathname === href || pathname.startsWith(`${href}/`);
          const Ikona = p.icon;
          return (
            <Link
              key={p.label}
              href={href}
              className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
                aktivni
                  ? "bg-teal-500/16 font-medium text-teal-300"
                  : "text-ink-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Ikona size={16} strokeWidth={2} />
              {p.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-white/8 px-5 py-4">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-teal-600 text-[12px] font-semibold text-white">
          {(uzivatel ?? "O").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-medium text-white">
            {uzivatel ?? "Organizátor"}
          </div>
          <div className="cal-eyebrow text-ink-500">Pořadatel</div>
        </div>
      </div>
    </aside>
  );
}
