"use client";

let leafletModule = null;
let loadPromise = null;
let iconsConfigured = false;

function configureDefaultIcons(L) {
  if (iconsConfigured) return;
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
  iconsConfigured = true;
}

/** Load Leaflet in the browser only (safe for SSR — no import on the server). */
export function getLeaflet() {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if (leafletModule) {
    return Promise.resolve(leafletModule);
  }
  if (!loadPromise) {
    loadPromise = import("leaflet").then((mod) => {
      leafletModule = mod.default;
      configureDefaultIcons(leafletModule);
      return leafletModule;
    });
  }
  return loadPromise;
}

/** Synchronous access after {@link getLeaflet} has resolved; undefined until then. */
export function getLeafletIfLoaded() {
  return leafletModule ?? undefined;
}