import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Calderon design system — JetBrains Mono (technical accents) + Now (brand).
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jb",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const now = localFont({
  variable: "--font-now",
  display: "swap",
  src: [
    { path: "../../fonts/Now-Light.otf", weight: "300", style: "normal" },
    { path: "../../fonts/Now-Regular.otf", weight: "400", style: "normal" },
    { path: "../../fonts/Now-Medium.otf", weight: "500", style: "normal" },
    { path: "../../fonts/Now-Bold.otf", weight: "600 700", style: "normal" },
    { path: "../../fonts/Now-Black.otf", weight: "800 900", style: "normal" },
  ],
});

// Now Alt — alternativní glyfy jen pro brand momenty (hero/tisk/veřejné titulky).
const nowAlt = localFont({
  variable: "--font-nowalt",
  display: "swap",
  src: [
    { path: "../../fonts/NowAlt-Regular.otf", weight: "400", style: "normal" },
    { path: "../../fonts/NowAlt-Medium.otf", weight: "500", style: "normal" },
    { path: "../../fonts/NowAlt-Bold.otf", weight: "600 700", style: "normal" },
    { path: "../../fonts/NowAlt-Black.otf", weight: "800 900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Časomíra — výsledky závodů",
  description: "Organizace a měření závodů, startovní a výsledkové listiny online.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${now.variable} ${nowAlt.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
