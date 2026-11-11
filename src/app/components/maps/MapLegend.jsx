"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MAP_PIN_LEGEND } from "@/lib/mapPinUtils";

export function MapLegend({ className = "", compact = false, items = MAP_PIN_LEGEND, title = "Map Legend" }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className={`max-w-full bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-white/10 rounded-xl shadow-lg backdrop-blur-sm ${compact ? "p-2" : "p-3"} ${className}`}
      aria-label="Map legend"
    >
      <button
        type="button"
        className="flex min-h-8 w-full items-center justify-between gap-2 text-left text-[9px] font-black uppercase tracking-widest text-zinc-500"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        {title}
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {expanded ? (
        <ul className={`${compact ? "mt-1 max-h-[35dvh] space-y-1.5 overflow-y-auto" : "mt-2 space-y-2"}`}>
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 items-center gap-2">
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
            <span className={`${compact ? "text-[9px]" : "text-[10px]"} min-w-0 break-words font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wide`}>
              {item.label}
            </span>
          </li>
        ))}
        </ul>
      ) : null}
    </div>
  );
}
