"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useMap } from "react-leaflet";
import { geocodeAlerts } from "@/lib/geocodeLocation";
import { createCategoryPinIcon, getAlertPinCategory } from "@/lib/mapPinUtils";

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

function storedPosition(alert) {
  const lat = Number(alert?.latitude);
  const lng = Number(alert?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  return null;
}

function FitAlertBounds({ positions }) {
  const map = useMap();
  const signature = positions.map((position) => position.join(",")).join("|");

  useEffect(() => {
    if (!positions.length) return undefined;

    const fit = () => {
      try {
        const size = map.getSize();
        if (!size.x || !size.y) return;
        const paddingTopLeft = [Math.min(156, Math.round(size.x * 0.42)), 28];
        const paddingBottomRight = [28, Math.min(132, Math.round(size.y * 0.3))];

        if (positions.length === 1) {
          map.setView(positions[0], 14);
          return;
        }

        map.fitBounds(positions, {
          paddingTopLeft,
          paddingBottomRight,
          maxZoom: 14,
        });
      } catch {
        /* map not ready */
      }
    };

    let timer = window.setTimeout(fit, 180);
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fit, 120);
    };
    window.addEventListener("resize", schedule);
    const container = map.getContainer();
    let observer;
    if (container && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      observer.observe(container);
    }

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
    // signature changes when a newly geocoded alert gets a position
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signature]);

  return null;
}

export function CrisisAlertMapMarkers({ alerts, renderPopup, fitToAlerts = false }) {
  const [coordsById, setCoordsById] = useState({});
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;
  const alertKey = useMemo(
    () => alerts.map((alert) => `${alert.id}:${alert.location}:${alert.latitude}:${alert.longitude}`).join("|"),
    [alerts]
  );

  useEffect(() => {
    let cancelled = false;
    const current = alertsRef.current;

    if (!current.length) {
      setCoordsById({});
      return undefined;
    }

    (async () => {
      const resolved = await geocodeAlerts(current);
      if (!cancelled) setCoordsById(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [alertKey]);

  const positions = alerts
    .map((alert) => storedPosition(alert) ?? coordsById[alert.id])
    .filter((position) => Array.isArray(position) && position.length === 2);

  return (
    <>
      {fitToAlerts ? <FitAlertBounds positions={positions} /> : null}
      {alerts.map((alert) => {
        const position = storedPosition(alert) ?? coordsById[alert.id];
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
      })}
    </>
  );
}
