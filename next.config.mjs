import path from "path";
import { fileURLToPath } from "url";
import withPWAInit from "@ducanh2912/next-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["nodemailer"],
  turbopack: {
    root: __dirname,
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
