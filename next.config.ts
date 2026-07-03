import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Bez `output: standalone` — image drží plné node_modules (kvůli migracím
  // `db:migrate` přes tsx) a spouští `next start`. Standalone by s `next start`
  // nefungoval (Next waruje) a nic by zde neušetřil.
  // Nativní / server-only moduly se nesmí bundlovat do server komponent.
  serverExternalPackages: [
    "@node-rs/argon2",
    "postgres",
    "@react-pdf/renderer",
    "exceljs",
  ],
};

export default nextConfig;
