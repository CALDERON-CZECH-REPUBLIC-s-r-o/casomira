"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LangToggle } from "@/components/lang-toggle";
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
  klic: string; // klíč do messages admin.nav.*
  segment: string; // "" = detail akce
  icon: LucideIcon;
  externi?: boolean; // mimo sidebar chrome (focus/kiosk)
}

const NAV: NavPolozka[] = [
  { klic: "detail", segment: "", icon: LayoutDashboard },
  { klic: "kategorie", segment: "kategorie", icon: Tags },
  { klic: "zavodnici", segment: "zavodnici", icon: Users },
  { klic: "prihlasky", segment: "prihlasky", icon: ClipboardList },
  { klic: "mereni", segment: "mereni", icon: Timer, externi: true },
  { klic: "brany", segment: "brany", icon: MapPin },
  { klic: "opravy", segment: "opravy", icon: Wrench },
  { klic: "konflikty", segment: "konflikty", icon: AlertTriangle },
  { klic: "listiny", segment: "listiny", icon: FileText },
  { klic: "moderator", segment: "moderator", icon: Mic, externi: true },
  { klic: "publikovat", segment: "publikovat", icon: UploadCloud },
  { klic: "nastaveni", segment: "nastaveni", icon: Settings },
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
  const t = useTranslations("admin");
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
        <div className="cal-eyebrow text-teal-400">{t("eventEyebrow")}</div>
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
              key={p.klic}
              href={href}
              className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
                aktivni
                  ? "bg-teal-500/16 font-medium text-teal-300"
                  : "text-ink-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Ikona size={16} strokeWidth={2} />
              {t(`nav.${p.klic}`)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/8">
        <div className="flex items-center gap-2.5 px-5 pb-2 pt-4">
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-teal-600 text-[12px] font-semibold text-white">
            {(uzivatel ?? "O").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-medium text-white">
              {uzivatel ?? t("organizer")}
            </div>
            <div className="cal-eyebrow text-ink-500">{t("organizer")}</div>
          </div>
        </div>
        <div className="px-5 pb-4">
          <LangToggle variant="dark" />
        </div>
      </div>
    </aside>
  );
}
