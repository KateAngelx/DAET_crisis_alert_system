"use client";

import { useHydrated } from "@/lib/useHydrated";

let configured = false;

/** Point Leaflet's default marker images at the CDN (once, in the browser). */
function configureLeafletIcons() {
  if (configured || typeof window === "undefined") return;
  const L = require("leaflet");
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
  configured = true;
}

// Configure as soon as this module loads in the browser, before any map renders.
configureLeafletIcons();

/** True once in the browser, where Leaflet maps can render. */
export function useLeafletReady() {
  return useHydrated();
}
