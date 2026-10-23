import { networkInterfaces } from "node:os";

import type { NextConfig } from "next";

/** This machine's LAN IPv4 addresses, so a phone on the same Wi-Fi can load the dev server (dev only) */
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net !== undefined && net.family === "IPv4" && !net.internal)
  .map((net) => net!.address);

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Next blocks dev resources (JS, HMR) requested from other hosts; without this the page loads but never hydrates
  allowedDevOrigins: lanAddresses,
  // PGlite (development database) loads its own WebAssembly files: Node runs it as is, unbundled
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    // AVIF first: about half the bytes of WebP for the menu photos, on phones that are often on a weak signal
    formats: ["image/avif", "image/webp"],
    // Widths for the fixed-size photos (menu rows 88/104px, cart 56px, logo 84px) at 2x and 3x.
    // With the defaults a 3x phone jumps from 256 to 384 for an 88px photo.
    imageSizes: [64, 96, 128, 176, 256, 320],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
