"use client";

import React from "react";
import { Clock, MapPin, ShieldAlert } from "lucide-react";
import { CardIconBox } from "@/app/components/ui/CardIconBox";
import { DangerSeverityIcon } from "@/app/components/ui/cardTypeIcons";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { AlternativeRouteDisplay } from "@/app/components/danger/AlternativeRouteDisplay";
import {
  getDangerSeverityStyles,
  formatWarningTimeRange,
} from "@/lib/dangerousLocationUtils";
import { iconSize, outlinedCard, typography } from "@/lib/designSystem";

export function DangerousLocationCard({ warning, affectsRoute = false, onClick, highlighted = false }) {
  const styles = getDangerSeverityStyles(warning.severity);
  const isDanger = warning.severity === "Dangerous" || warning.severity === "Critical";

  return (
    <div id={`hazard-${warning.id}`} className={highlighted ? "rounded-2xl ring-2 ring-blue-500 ring-offset-2" : undefined}>
    <OutlinedCard
      padding={outlinedCard.alertPadding}
      onClick={onClick}
      interactive={Boolean(onClick)}
      className={`text-left ${onClick ? "cursor-pointer" : ""} border-2 ${styles.border}`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <CardIconBox boxClass={styles.icon}>
              <DangerSeverityIcon severity={warning.severity} size={iconSize.stat} />
            </CardIconBox>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${styles.badge}`}>
                  {styles.label}
                </span>
                {affectsRoute && (
                  <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-red-100 text-red-700">
                    Affects Your Route
                  </span>
                )}
                <span className="text-[9px] font-black uppercase px-2 py-1 bg-zinc-100 text-zinc-600 rounded">
                  {warning.danger_type}
                </span>
              </div>
              <h3 className={`${typography.cardTitleBase} ${onClick ? styles.title : styles.titleStatic}`}>{warning.dangerous_location}</h3>
              <p className="text-sm text-zinc-600 mt-1 font-medium">
                {isDanger
                  ? "Avoid this location. Follow the recommended alternative route below."
                  : "Exercise caution in this area. Consider the alternative route below."}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-3 rounded-xl ${styles.bg} border ${styles.border}`}>
          <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Why it is unsafe</p>
          <p className={`text-sm font-bold ${styles.text}`}>
            {warning.danger_type} — {warning.severity} level warning for {warning.dangerous_location}
          </p>
        </div>

        <AlternativeRouteDisplay warning={warning} />

        {warning.safety_instructions && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
            <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 flex items-center gap-1.5">
              <ShieldAlert size={iconSize.inlineSm} className="text-blue-600" /> Safety Instructions
            </p>
            <p className="text-sm text-zinc-700 font-medium leading-relaxed">{warning.safety_instructions}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-zinc-400 uppercase">
          <span className="flex items-center gap-1.5">
            <MapPin size={iconSize.inlineSm} className="text-red-500" /> {warning.dangerous_location}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={iconSize.inlineSm} /> {formatWarningTimeRange(warning)}
          </span>
        </div>
      </div>
    </OutlinedCard>
    </div>
  );
}
