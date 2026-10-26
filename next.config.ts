import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "a.espncdn.com" }],
  },
  async redirects() {
    return [
      { source: "/studyo.php", destination: "/studyo", permanent: true },
      { source: "/tahminler.php", destination: "/tahminler", permanent: true },
      { source: "/gizlilik.php", destination: "/gizlilik", permanent: true },
      { source: "/sitemap.php", destination: "/sitemap.xml", permanent: true },
      { source: "/robots.php", destination: "/robots.txt", permanent: true },
      { source: "/index.php", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};
export default config;
