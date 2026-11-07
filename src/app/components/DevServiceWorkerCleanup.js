"use client";

import { useEffect } from "react";

const RELOAD_KEY = "daet-dev-service-worker-cleanup";

export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !("serviceWorker" in navigator)) {
      return;
    }

    async function cleanStaleServiceWorker() {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const staleRegistrations = registrations.filter((registration) => {
        return [registration.active, registration.waiting, registration.installing].some((worker) => {
          if (!worker) return false;
          const scriptUrl = new URL(worker.scriptURL);
          return scriptUrl.origin === window.location.origin && scriptUrl.pathname === "/sw.js";
        });
      });

      await Promise.all(staleRegistrations.map((registration) => registration.unregister()));

      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith("workbox-"))
          .map((name) => caches.delete(name))
      );

      const controllerUrl = navigator.serviceWorker.controller?.scriptURL;
      const hasStaleController = controllerUrl &&
        new URL(controllerUrl).origin === window.location.origin &&
        new URL(controllerUrl).pathname === "/sw.js";
      if (hasStaleController && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
      }
    }

    cleanStaleServiceWorker().catch((error) => {
      console.error("Could not remove the stale development service worker.", error);
    });
  }, []);

  return null;
}
