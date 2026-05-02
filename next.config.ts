import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Raíz real del repo (evita que Next asuma el home por otro lockfile). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=()",
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  /** Dev: mismo Next en localhost pero el navegador en 127.0.0.1 (HMR /_next/*). */
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: false },
      { source: "/inicio", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
