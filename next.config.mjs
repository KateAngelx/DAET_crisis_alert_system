import path from "path";
import { fileURLToPath } from "url";
import withPWAInit from "@ducanh2912/next-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  // Keep pages people already visited so they open without internet.
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // When a page cannot load offline, show the emergency page (hotlines + saved alerts).
  fallbacks: { document: "/~offline" },
});

// Report photos are stored in Supabase Storage; let next/image serve smaller, optimised copies.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  } catch {
    return "*.supabase.co";
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["nodemailer", "web-push"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/push/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/crisis/admin/routes", destination: "/crisis/roads", permanent: false },
      { source: "/crisis/admin/dangerous-locations", destination: "/crisis/hazards", permanent: false },
      { source: "/crisis/admin", destination: "/crisis/command", permanent: false },
      { source: "/crisis/routes", destination: "/routes", permanent: false },
    ];
  },
};

export default withPWA(nextConfig);
