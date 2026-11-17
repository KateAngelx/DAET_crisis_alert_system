"use client";

import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

function boundsOf(positions) {
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const position of positions) {
    const lat = Number(position?.[0]);
    const lng = Number(position?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    minLat = Math.min(minLat, lat);
    minLng = Math.min(minLng, lng);
    maxLat = Math.max(maxLat, lat);
    maxLng = Math.max(maxLng, lng);
  }
  if (!Number.isFinite(minLat)) return null;
  return [[minLat, minLng], [maxLat, maxLng]];
}

/**
 * Moves the map when its pin or line changes.
 * MapContainer's own `center` prop is only read on the first render, so without this
 * a new pin or route can sit off-screen.
 *
 * - `positions`: points to keep in view (pins or a route line); takes priority over `center`.
 * - `center` + `zoom`: a single spot to show.
 */
export function MapViewController({ center = null, zoom, positions = null, maxZoom = 16 }) {
  const map = useMap();
  const bounds = positions?.length ? boundsOf(positions) : null;
  const boundsKey = bounds ? bounds.flat().map((n) => n.toFixed(6)).join(",") : "";
  const centerKey = center ? `${Number(center[0]).toFixed(6)},${Number(center[1]).toFixed(6)}` : "";

  useEffect(() => {
    try {
      if (bounds) {
        const [[minLat, minLng], [maxLat, maxLng]] = bounds;
        if (minLat === maxLat && minLng === maxLng) {
          map.setView([minLat, minLng], Math.max(map.getZoom(), 15));
        } else {
          map.fitBounds(bounds, { padding: [28, 28], maxZoom });
        }
        return;
      }
      if (center) map.setView(center, zoom ?? map.getZoom());
    } catch {
      /* map not ready yet; the next change will move it */
    }
    // Keys capture every value that matters; arrays are recreated on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey, centerKey, zoom, maxZoom]);

  return null;
}

/** Calls `onPick([lat, lng])` when the map is clicked. */
export function MapClickPicker({ onPick, disabled = false }) {
  useMapEvents({
    click(event) {
      if (disabled || !onPick) return;
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}
