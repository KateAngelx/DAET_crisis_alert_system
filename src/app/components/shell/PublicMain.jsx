"use client";

import { usePathname } from "next/navigation";

export function PublicMain({ children }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const paddingBottom = isHome ? "pb-0" : "pb-20 sm:pb-24";

  return (
    <main
      className={`flex-1 scrollbar-none bg-zinc-100/80 p-4 md:p-6 lg:p-8 ${paddingBottom}`}
      data-public-main={isHome ? "home" : "default"}
    >
      {children}
    </main>
  );
}
