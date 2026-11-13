"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { geocodeAlerts, geocodeLocation, parseMapCoordinates } from "@/lib/geocodeLocation";
import { createCategoryPinIcon, createSafeRoutePinIcon, getDangerPinCategory } from "@/lib/mapPinUtils";

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

export function DangerousLocationMapMarkers({ warnings, renderPopup, showSafeRoutePins = true }) {
  const [geocoded, setGeocoded] = useState({ key: "", coords: {} });
  const [safeGeocoded, setSafeGeocoded] = useState({ key: "", coords: {} });
  const warningsRef = useRef(warnings);

  useEffect(() => {
    warningsRef.current = warnings;
  }, [warnings]);

  const warningKey = useMemo(
    () =>
      warnings
        .map((w) => `${w.id}:${w.dangerous_location}:${w.destination}:${w.latitude}:${w.longitude}:${w.alt_latitude}:${w.alt_longitude}`)
        .join("|"),
    [warnings]
  );

  useEffect(() => {
    let cancelled = false;
    const currentWarnings = warningsRef.current;
    if (!currentWarnings.length) return undefined;

    const geocodeInput = currentWarnings.map((w) => ({
      id: w.id,
      location: w.dangerous_location,
      latitude: w.latitude,
      longitude: w.longitude,
    }));

    (async () => {
      const resolved = await geocodeAlerts(geocodeInput);
      if (cancelled) return;
      setGeocoded({ key: warningKey, coords: resolved });

      if (!showSafeRoutePins) return;

      const safeResolved = {};
      for (const warning of currentWarnings) {
        const dest = warning.destination?.trim();
        if (!dest) continue;
        const storedCoordinates = parseMapCoordinates(warning.alt_latitude, warning.alt_longitude);
        if (storedCoordinates) {
          safeResolved[`${warning.id}-safe`] = storedCoordinates;
          continue;
        }
        const coords = await geocodeLocation(dest);
        if (coords) safeResolved[`${warning.id}-safe`] = coords;
      }
      if (!cancelled) setSafeGeocoded({ key: warningKey, coords: safeResolved });
    })();

    return () => {
      cancelled = true;
    };
  }, [warningKey, showSafeRoutePins]);

  const coordsById = geocoded.key === warningKey ? geocoded.coords : {};
  const safeCoordsById = safeGeocoded.key === warningKey ? safeGeocoded.coords : {};

  return (
    <>
      {warnings.map((warning) => {
        const stored = parseMapCoordinates(warning.latitude, warning.longitude);
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
