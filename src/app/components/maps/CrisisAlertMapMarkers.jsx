"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { geocodeAlerts, geocodeLocation } from "@/lib/geocodeLocation";
import { createCategoryPinIcon, getAlertPinCategory } from "@/lib/mapPinUtils";

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

export function CrisisAlertMapMarkers({ alerts, renderPopup }) {
  const [coordsById, setCoordsById] = useState({});
  const alertKey = useMemo(
    () => alerts.map((alert) => `${alert.id}:${alert.location}:${alert.latitude}:${alert.longitude}`).join("|"),
    [alerts]
  );

  useEffect(() => {
    let cancelled = false;

    if (!alerts.length) {
      setCoordsById({});
      return undefined;
    }

    (async () => {
      const resolved = await geocodeAlerts(alerts);
      if (!cancelled) setCoordsById(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [alertKey, alerts]);

  return alerts.map((alert) => {
    const stored =
      alert.latitude != null && alert.longitude != null
        ? [Number(alert.latitude), Number(alert.longitude)]
        : null;
    const position = stored ?? coordsById[alert.id];

    if (!position) return null;

    const category = getAlertPinCategory(alert);

    return (
      <Marker key={alert.id} position={position} icon={createCategoryPinIcon(category)}>
        {renderPopup ? (
          renderPopup(alert)
        ) : (
          <Popup>
            <div className="p-2 text-left text-black">
              <p className="text-[10px] font-black uppercase text-red-600 leading-none mb-1">
                {alert.severity} Alert
              </p>
              <p className="font-bold text-sm leading-tight">{alert.title}</p>
              <p className="text-[10px] text-zinc-500 mt-2 font-medium italic">{alert.location}</p>
            </div>
          </Popup>
        )}
      </Marker>
    );
  });
}
