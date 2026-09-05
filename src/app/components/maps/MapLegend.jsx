"use client";

import React from "react";
import { MAP_PIN_LEGEND } from "@/lib/mapPinUtils";

export function MapLegend({ className = "", compact = false, items = MAP_PIN_LEGEND }) {
  return (
    <div
      className={`bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-white/10 rounded-xl shadow-lg backdrop-blur-sm ${compact ? "p-2.5" : "p-3"} ${className}`}
      aria-label="Map legend"
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Map Legend</p>
      <ul className={`${compact ? "space-y-1.5" : "space-y-2"}`}>
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            {item.kind === "line" ? (
              <span
                className="shrink-0 rounded-full"
                style={{
                  background: item.color,
                  width: compact ? 14 : 16,
                  height: compact ? 3 : 4,
                }}
              />
            ) : (
              <span
                className="shrink-0 rounded-full border-2 border-white shadow-sm"
                style={{
                  background: item.color,
                  width: compact ? 10 : 12,
                  height: compact ? 10 : 12,
                }}
              />
            )}
            <span className={`${compact ? "text-[9px]" : "text-[10px]"} font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wide`}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
