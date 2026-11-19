"use client";

import { getLeafletIfLoaded } from "@/lib/leafletClient";
import { getPinColor } from "@/lib/mapPinUtils";

/**
 * Leaflet div icons (browser only). Keep in a client module so SSR never loads leaflet.
 */
export function createCategoryPinIcon(categoryId, glyphSvg = "") {
  const L = getLeafletIfLoaded();
  if (!L) return undefined;

  const color = getPinColor(categoryId);
  const glyph = glyphSvg
    ? `<div style="position:absolute;top:6px;left:6px;width:12px;height:12px;display:flex;align-items:center;justify-content:center;color:#fff;line-height:0">${glyphSvg}</div>`
    : "";

  return L.divIcon({
    className: "map-category-pin",
    html: `<div aria-hidden="true" style="width:24px;height:32px;position:relative">
      <div style="background:${color};width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);position:absolute;top:2px;left:2px"></div>
      ${glyph}
      <div style="background:${color};width:8px;height:8px;border-radius:50%;position:absolute;bottom:0;left:8px;opacity:.35"></div>
    </div>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -30],
  });
}

export function createSafeRoutePinIcon() {
  return createCategoryPinIcon("route_safe");
}