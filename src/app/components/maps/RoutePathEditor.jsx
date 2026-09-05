"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useMapEvents } from "react-leaflet";
import { parseRoutePath, serializeRoutePath } from "@/lib/routeGeometryUtils";

const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });

function PathClickHandler({ onAddPoint, disabled }) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export function RoutePathEditorLayer({ path = [], onChange, disabled = false, color = "#2563eb" }) {
  const positions = parseRoutePath(path);

  const handleAddPoint = (coords) => {
    if (!onChange) return;
    const next = serializeRoutePath([...positions, coords]);
    onChange(next);
  };

  return (
    <>
      <PathClickHandler onAddPoint={handleAddPoint} disabled={disabled} />
      {positions.length >= 2 && (
        <Polyline
          positions={positions}
          pathOptions={{ color, weight: 4, opacity: 0.85 }}
        />
      )}
      {positions.map(([lat, lng], index) => (
        <CircleMarker
          key={`${lat}-${lng}-${index}`}
          center={[lat, lng]}
          radius={index === 0 ? 7 : index === positions.length - 1 ? 7 : 5}
          pathOptions={{
            color: index === 0 ? "#2563eb" : index === positions.length - 1 ? "#16a34a" : color,
            fillColor: index === 0 ? "#2563eb" : index === positions.length - 1 ? "#16a34a" : color,
            fillOpacity: 0.9,
            weight: 2,
          }}
        />
      ))}
    </>
  );
}

export function RoutePathEditorControls({ path = [], onChange }) {
  const points = serializeRoutePath(path);

  const undoLast = () => {
    if (points.length === 0) return;
    onChange(points.slice(0, -1));
  };

  const clearAll = () => onChange([]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase text-zinc-400">
          Route path ({points.length} waypoint{points.length !== 1 ? "s" : ""})
        </span>
        {points.length > 0 && (
          <>
            <button
              type="button"
              onClick={undoLast}
              className="text-[10px] font-black uppercase text-blue-600 hover:underline"
            >
              Undo last
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] font-black uppercase text-red-600 hover:underline"
            >
              Clear path
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-zinc-500 font-medium">
        Click the map to add waypoints. First point = start (blue), last = end (green). Need at least 2 points to draw a route line.
      </p>
      {points.length > 0 && (
        <ol className="max-h-28 overflow-y-auto text-xs text-zinc-600 space-y-1 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
          {points.map((p, i) => (
            <li key={`${p.lat}-${p.lng}-${i}`} className="font-mono">
              {i + 1}. {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
