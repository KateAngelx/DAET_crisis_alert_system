"use client";

import { useEffect, useState } from "react";

export function isInstalledApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

let installedSubscribers = 0;

/** Synchronizes installed-app mode with the document root for responsive navigation styles. */
export function useInstalledApp() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    installedSubscribers += 1;
    const media = window.matchMedia("(display-mode: standalone)");
    const update = () => {
      const isInstalled = isInstalledApp();
      document.documentElement.dataset.installedApp = String(isInstalled);
      setInstalled(isInstalled);
    };
    update();
    media.addEventListener?.("change", update);
    return () => {
      media.removeEventListener?.("change", update);
      installedSubscribers = Math.max(0, installedSubscribers - 1);
      if (installedSubscribers === 0) {
        delete document.documentElement.dataset.installedApp;
      }
    };
  }, []);

  return installed;
}
