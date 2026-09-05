"use client";

import { ArrowRight, MapPin, Route } from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { getRouteStatusStyles } from "@/lib/routesUtils";
import { iconSize, outlinedCard, typography } from "@/lib/designSystem";

export function RouteListCard({ route, onSelect }) {
  const styles = getRouteStatusStyles(route.status);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(route)}
      className="block w-full text-left no-underline group"
    >
      <OutlinedCard
        padding={outlinedCard.alertPadding}
        className={`border-2 ${styles.border} hover:scale-[1.01] transition-transform cursor-pointer`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${styles.badge}`}>
                {route.statusLabel || styles.label}
              </span>
              {route.subtitle && (
                <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-zinc-100 text-zinc-600">
                  {route.subtitle}
                </span>
              )}
            </div>
            <h3 className={`${typography.cardTitle} group-hover:text-blue-600 transition-colors`}>{route.title}</h3>
            <p className="text-xs text-zinc-500 font-medium mt-2 flex items-center gap-1.5">
              <Route size={iconSize.inlineSm} className="shrink-0" />
              {route.from} → {route.to}
            </p>
            {route.via && (
              <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1 flex items-center gap-1">
                <MapPin size={iconSize.inlineSm} /> Via {route.via}
              </p>
            )}
          </div>
          <ArrowRight size={16} className="text-zinc-300 group-hover:text-blue-600 shrink-0 mt-1" />
        </div>
      </OutlinedCard>
    </button>
  );
}
