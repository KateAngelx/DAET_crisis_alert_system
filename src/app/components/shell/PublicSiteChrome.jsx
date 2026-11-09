"use client";

import { usePathname } from "next/navigation";
import { PublicHeader } from "@/app/components/PublicHeader";
import { PublicFooter } from "@/app/components/PublicFooter";

const PRIVATE_PREFIXES = [
  "/admin",
  "/guide",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/crisis/command",
  "/crisis/roads",
  "/crisis/hazards",
];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Keeps the public header and footer mounted across Home, Crisis Hub, and the other public pages. */
export function PublicSiteChrome({ children }) {
  const pathname = usePathname() || "/";
  if (isPrivatePath(pathname)) return children;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground scrollbar-none">
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
