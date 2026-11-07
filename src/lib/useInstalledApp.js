"use client";

import { useEffect } from "react";

export function isInstalledApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

/** Synchronizes installed-app mode with the document root for responsive navigation styles. */
export function useInstalledApp() {
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const update = () => {
      const isInstalled = isInstalledApp();
      document.documentElement.dataset.installedApp = String(isInstalled);
    };
    update();
    media.addEventListener?.("change", update);
    return () => {
      media.removeEventListener?.("change", update);
      delete document.documentElement.dataset.installedApp;
    };
  }, []);
}
