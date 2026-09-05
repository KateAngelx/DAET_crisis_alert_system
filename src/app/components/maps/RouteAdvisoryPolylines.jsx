"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { parseRoutePath, getRoutePolylineStyle } from "@/lib/routeGeometryUtils";
import { useResolvedRouteAdvisories } from "@/lib/useResolvedRouteAdvisories";

const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

export function RouteAdvisoryPolylines({ advisories = [], highlightId = null }) {
  const resolvedAdvisories = useResolvedRouteAdvisories(advisories);

  const lines = useMemo(
    () =>
      resolvedAdvisories
        .map((advisory) => {
          const positions = parseRoutePath(advisory);
          if (positions.length < 2) return null;
          return {
            advisory,
            positions,
            style: getRoutePolylineStyle(advisory),
            highlighted: highlightId === advisory.id,
          };
        })
        .filter(Boolean),
    [resolvedAdvisories, highlightId]
  );

  if (lines.length === 0) return null;

  return (
    <>
      {lines.map(({ advisory, positions, style, highlighted }) => (
        <Polyline
          key={advisory.id}
          positions={positions}
          pathOptions={{
            color: style.color,
            weight: highlighted ? style.weight + 2 : style.weight,
            opacity: highlighted ? 1 : style.opacity,
            dashArray: style.dashArray || undefined,
          }}
        >
          <Popup>
            <div className="p-2 text-left text-black min-w-[140px]">
              <p className="text-[10px] font-black uppercase text-zinc-500">
                {advisory.route_status} · {advisory.route_type}
              </p>
              <p className="font-bold text-sm">{advisory.title}</p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {advisory.from_location || "Start"} → {advisory.to_location}
              </p>
            </div>
          </Popup>
        </Polyline>
      ))}
    </>
  );
}
