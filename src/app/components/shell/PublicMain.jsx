"use client";

import { usePathname } from "next/navigation";
export function PublicMain({ children }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const mobileChromeBottom = "pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-8";
  const mobileChromeTop = isHome ? "" : "pt-[calc(3.75rem+env(safe-area-inset-top))] md:pt-0";

  return (
    <main
      className={
        isHome
          ? `flex-1 scrollbar-none bg-white p-0 ${mobileChromeBottom} ${mobileChromeTop}`
          : `flex-1 scrollbar-none bg-zinc-100/80 p-4 md:p-6 lg:p-8 ${mobileChromeBottom} ${mobileChromeTop}`
      }
      data-public-main={isHome ? "home" : "default"}
    >
      {children}
    </main>
  );
}
