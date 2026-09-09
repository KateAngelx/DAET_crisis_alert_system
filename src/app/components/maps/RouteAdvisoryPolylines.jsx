"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { parseRoutePath, getRoutePolylineStyle } from "@/lib/routeGeometryUtils";
import { useResolvedRouteAdvisories } from "@/lib/useResolvedRouteAdvisories";

const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

const START_COLOR = "#2563eb";
const END_COLOR = "#16a34a";

function createEndpointIcon(label, color) {
  if (typeof window === "undefined") return undefined;
  const L = require("leaflet");
  return L.divIcon({
    className: "route-endpoint-marker",
    html: `<div aria-hidden="true" style="display:flex;flex-direction:column;align-items:center;pointer-events:none">
      <div style="background:${color};color:#fff;font-size:9px;font-weight:900;width:22px;height:22px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;line-height:1">${label}</div>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

export function RouteAdvisoryPolylines({ advisories = [], highlightId = null, showEndpoints = true }) {
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
        <React.Fragment key={advisory.id}>
          <Polyline
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

          {showEndpoints && (
            <>
              <Marker
                position={positions[0]}
                icon={createEndpointIcon("S", START_COLOR)}
                zIndexOffset={500}
              >
                <Popup>
                  <div className="p-2 text-left text-black min-w-[120px]">
                    <p className="text-[10px] font-black uppercase text-blue-600">Start</p>
                    <p className="font-bold text-sm">{advisory.from_location || "Route start"}</p>
                  </div>
                </Popup>
              </Marker>
              <Marker
                position={positions[positions.length - 1]}
                icon={createEndpointIcon("E", END_COLOR)}
                zIndexOffset={500}
              >
                <Popup>
                  <div className="p-2 text-left text-black min-w-[120px]">
                    <p className="text-[10px] font-black uppercase text-green-600">End</p>
                    <p className="font-bold text-sm">{advisory.to_location || "Route end"}</p>
                  </div>
                </Popup>
              </Marker>
              <CircleMarker
                center={positions[0]}
                radius={highlighted ? 6 : 4}
                pathOptions={{
                  color: START_COLOR,
                  fillColor: START_COLOR,
                  fillOpacity: 0.15,
                  weight: 1,
                }}
              />
              <CircleMarker
                center={positions[positions.length - 1]}
                radius={highlighted ? 6 : 4}
                pathOptions={{
                  color: END_COLOR,
                  fillColor: END_COLOR,
                  fillOpacity: 0.15,
                  weight: 1,
                }}
              />
            </>
          )}
        </React.Fragment>
      ))}
    </>
  );
}
