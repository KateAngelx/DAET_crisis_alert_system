"use client";

import { usePathname } from "next/navigation";
import { useInstalledApp } from "@/lib/useInstalledApp";

export function PublicMain({ children }) {
  const pathname = usePathname();
  const installed = useInstalledApp();
  const isHome = pathname === "/";
  const bottomPad = installed ? "pb-20 sm:pb-24 xl:pb-8" : "pb-6";

  return (
    <main
      className={
        isHome
          ? `flex-1 scrollbar-none bg-zinc-50 p-0 ${bottomPad}`
          : `flex-1 scrollbar-none bg-zinc-100/80 p-4 md:p-6 lg:p-8 ${bottomPad}`
      }
      data-public-main={isHome ? "home" : "default"}
    >
      {children}
    </main>
  );
}
