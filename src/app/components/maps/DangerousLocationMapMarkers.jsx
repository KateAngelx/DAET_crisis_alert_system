"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { geocodeAlerts, geocodeLocation } from "@/lib/geocodeLocation";
import { createCategoryPinIcon, createSafeRoutePinIcon, getDangerPinCategory } from "@/lib/mapPinUtils";

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

export function DangerousLocationMapMarkers({ warnings, renderPopup, showSafeRoutePins = true }) {
  const [coordsById, setCoordsById] = useState({});
  const [safeCoordsById, setSafeCoordsById] = useState({});

  const warningKey = useMemo(
    () =>
      warnings
        .map((w) => `${w.id}:${w.dangerous_location}:${w.destination}:${w.latitude}:${w.longitude}`)
        .join("|"),
    [warnings]
  );

  useEffect(() => {
    let cancelled = false;
    if (!warnings.length) {
      setCoordsById({});
      setSafeCoordsById({});
      return undefined;
    }

    const geocodeInput = warnings.map((w) => ({
      id: w.id,
      location: w.dangerous_location,
      latitude: w.latitude,
      longitude: w.longitude,
    }));

    (async () => {
      const resolved = await geocodeAlerts(geocodeInput);
      if (cancelled) return;
      setCoordsById(resolved);

      if (!showSafeRoutePins) return;

      const safeResolved = {};
      for (const warning of warnings) {
        const dest = warning.destination?.trim();
        if (!dest) continue;
        if (warning.alt_latitude != null && warning.alt_longitude != null) {
          safeResolved[`${warning.id}-safe`] = [Number(warning.alt_latitude), Number(warning.alt_longitude)];
          continue;
        }
        const coords = await geocodeLocation(dest);
        if (coords) safeResolved[`${warning.id}-safe`] = coords;
      }
      if (!cancelled) setSafeCoordsById(safeResolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [warningKey, warnings, showSafeRoutePins]);

  return (
    <>
      {warnings.map((warning) => {
        const stored =
          warning.latitude != null && warning.longitude != null
            ? [Number(warning.latitude), Number(warning.longitude)]
            : null;
        const position = stored ?? coordsById[warning.id];
        if (!position) return null;

        const category = getDangerPinCategory(warning);

        return (
          <Marker key={warning.id} position={position} icon={createCategoryPinIcon(category)}>
            {renderPopup ? (
              renderPopup(warning)
            ) : (
              <Popup>
                <div className="p-2 text-left text-black min-w-[140px]">
                  <p className="text-[10px] font-black uppercase text-red-600">{warning.severity} Warning</p>
                  <p className="font-bold text-sm">{warning.dangerous_location}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{warning.danger_type}</p>
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}

      {showSafeRoutePins &&
        warnings.map((warning) => {
          const position = safeCoordsById[`${warning.id}-safe`];
          if (!position) return null;
          return (
            <Marker
              key={`${warning.id}-safe-route`}
              position={position}
              icon={createSafeRoutePinIcon()}
            >
              <Popup>
                <div className="p-2 text-left text-black min-w-[140px]">
                  <p className="text-[10px] font-black uppercase text-green-700">Safe Route Destination</p>
                  <p className="font-bold text-sm">{warning.destination}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Via {warning.alternative_route}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
    </>
  );
}
