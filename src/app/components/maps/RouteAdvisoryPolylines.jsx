"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { getLeafletIfLoaded } from "@/lib/leafletClient";
import { MapViewController } from "@/app/components/maps/MapViewController";
import { parseRoutePath, getRoutePolylineStyle } from "@/lib/routeGeometryUtils";
import { ROUTE_POLYLINE_COLORS } from "@/lib/mapPinUtils";
import { useResolvedRouteAdvisories } from "@/lib/useResolvedRouteAdvisories";

const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

const START_COLOR = ROUTE_POLYLINE_COLORS.default;
const END_COLOR = ROUTE_POLYLINE_COLORS.safe;

function createEndpointIcon(label, color) {
  const L = getLeafletIfLoaded();
  if (!L) return undefined;
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

export function RouteAdvisoryPolylines({
  advisories = [],
  highlightId = null,
  showEndpoints = true,
  fitBounds = false,
}) {
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

  const allPositions = useMemo(() => lines.flatMap((line) => line.positions), [lines]);

  if (lines.length === 0) return null;

  return (
    <>
      {fitBounds ? <MapViewController positions={allPositions} maxZoom={15} /> : null}
      {lines.map(({ advisory, positions, style, highlighted }) => (
        <React.Fragment key={`${advisory.id}-${positions.length}`}>
          <Polyline
            key={`${advisory.id}-${positions.length}`}
            positions={positions}
            smoothFactor={0}
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
            </>
          )}
        </React.Fragment>
      ))}
    </>
  );
}
