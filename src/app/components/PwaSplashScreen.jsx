"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { siteInfo } from "@/lib/siteInfo";

const SPLASH_KEY = "daet-tourism-pwa-splash-v1";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function PwaSplashScreen() {
  const [phase, setPhase] = useState("hidden");

  useEffect(() => {
    if (!isStandalone()) return;
    if (sessionStorage.getItem(SPLASH_KEY) === "1") return;

    setPhase("visible");
    sessionStorage.setItem(SPLASH_KEY, "1");

    const fadeTimer = setTimeout(() => setPhase("fading"), 1400);
    const hideTimer = setTimeout(() => setPhase("hidden"), 1900);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        phase === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${siteInfo.brandName}`}
    >
      <div className="flex flex-col items-center gap-4 px-8 text-center">
        <BrandLogo size={96} />
        <div>
          <p className="text-xl font-black uppercase tracking-tight text-blue-600">{siteInfo.brandName}</p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">{siteInfo.officeName}</p>
        </div>
        <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
        </div>
      </div>
    </div>
  );
}
