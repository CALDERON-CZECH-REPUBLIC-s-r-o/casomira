import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Standalone build → malý runtime image (server.js + jen potřebné node_modules).
  // Coolify spouští `node server.js` ze stejného image.
  output: "standalone",
  // Nativní / server-only moduly se nesmí bundlovat do server komponent.
  serverExternalPackages: ["@node-rs/argon2", "postgres"],
};

export default nextConfig;
