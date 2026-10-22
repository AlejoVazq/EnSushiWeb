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
