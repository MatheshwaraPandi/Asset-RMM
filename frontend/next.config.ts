import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow opening the dev site from your LAN IP without Next.js blocking HMR resources.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["192.168.0.21", "localhost"],
};

export default nextConfig;
