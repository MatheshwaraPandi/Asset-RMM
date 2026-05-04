import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow opening the dev site from your LAN IP without Next.js blocking HMR resources.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.0.25", "192.168.1.3", "192.168.1.34"],
};

export default nextConfig;
