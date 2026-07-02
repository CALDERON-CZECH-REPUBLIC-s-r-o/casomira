import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

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
    { path: "../fonts/Now-Light.otf", weight: "300", style: "normal" },
    { path: "../fonts/Now-Regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/Now-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/Now-Bold.otf", weight: "600 700", style: "normal" },
    { path: "../fonts/Now-Black.otf", weight: "800 900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Časomíra — výsledky závodů",
  description: "Organizace a měření závodů, startovní a výsledkové listiny online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${geistSans.variable} ${geistMono.variable} ${now.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
