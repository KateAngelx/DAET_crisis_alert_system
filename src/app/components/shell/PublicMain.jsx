"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export function PublicMain({ children }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  useLayoutEffect(() => {
    if (!isHome || typeof window === "undefined") return;
    const main = document.querySelector("[data-public-main='home']");
    const hero = document.querySelector("[data-landing-section='hero']");
    if (!main || !hero) return;
    const mainStyle = window.getComputedStyle(main);
    const mainRect = main.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const vw = window.innerWidth;
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "home-layout",
        hypothesisId: "H1-main-padding",
        location: "PublicMain.jsx:layout",
        message: "home main vs hero geometry",
        data: {
          mainPadding: {
            top: mainStyle.paddingTop,
            left: mainStyle.paddingLeft,
            right: mainStyle.paddingRight,
          },
          mainWidth: Math.round(mainRect.width),
          heroWidth: Math.round(heroRect.width),
          heroLeft: Math.round(heroRect.left),
          heroTop: Math.round(heroRect.top),
          viewportWidth: vw,
          heroFlushEdges:
            Math.round(heroRect.left) === 0 &&
            Math.round(mainRect.width) >= vw - 1 &&
            Math.round(heroRect.width) >= vw - 1,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [isHome, pathname]);

  return (
    <main
      className={
        isHome
          ? "flex-1 scrollbar-none bg-zinc-50 p-0 pb-20 sm:pb-24"
          : "flex-1 scrollbar-none bg-zinc-100/80 p-4 md:p-6 lg:p-8 pb-20 sm:pb-24"
      }
      data-public-main={isHome ? "home" : "default"}
    >
      {children}
    </main>
  );
}
