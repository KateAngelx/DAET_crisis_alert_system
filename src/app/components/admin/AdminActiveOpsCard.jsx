"use client";

import { MapPin } from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { adminShell, outlinedCard, portalShell } from "@/lib/designSystem";

/**
 * Matches Command Center “Active incidents” list cards (icon, meta badge, title, quote, footer actions).
 */
export function AdminActiveOpsCard({
  icon,
  metaLabel,
  title,
  message,
  location,
  timeLabel,
  severityForCard,
  borderClassName = "",
  dimmed = false,
  primaryAction,
  secondaryActions = [],
  className = "",
  compact = false,
}) {
  const pad = compact ? outlinedCard.statPaddingCompact : outlinedCard.alertPadding;
  return (
    <OutlinedCard
      variant={severityForCard ? "severity" : undefined}
      severity={severityForCard}
      padding={pad}
      className={`bg-background ${compact ? "border" : "border-2"} ${borderClassName} ${dimmed ? "opacity-70" : ""} ${className}`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            {metaLabel ? (
              <span className={`font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 leading-none inline-block ${compact ? "text-[8px]" : "text-[9px]"}`}>
                {metaLabel}
              </span>
            ) : null}
            <h3 className={`font-black leading-tight uppercase text-zinc-900 dark:text-white break-words ${compact ? "text-sm mt-0.5 truncate" : "text-lg mt-1 font-bold"}`}>
              {title}
            </h3>
          </div>
        </div>
        {timeLabel ? (
          <span className={`font-bold opacity-60 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md leading-none font-sans shrink-0 ${compact ? "text-[9px]" : "text-[10px]"}`}>
            {timeLabel}
          </span>
        ) : null}
      </div>

      {message ? (
        <p className={`text-zinc-700 dark:text-zinc-300 font-medium italic ${compact ? "mt-2 text-xs leading-snug line-clamp-2" : "mt-3 text-sm leading-relaxed line-clamp-3"}`}>
          &ldquo;{message}&rdquo;
        </p>
      ) : null}

      <div className={`border-t border-gray-200 dark:border-white/10 flex flex-wrap justify-between items-center gap-2 leading-none ${compact ? "mt-2 pt-2" : "mt-4 pt-4"}`}>
        {location ? (
          <div className={`flex items-center gap-1 font-bold text-zinc-500 uppercase leading-none min-w-0 ${compact ? "text-[10px]" : "text-xs"}`}>
            <MapPin size={compact ? 12 : 14} className="text-blue-500 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {secondaryActions.map(({ key, label, onClick, className: btnClass = "", icon: ActionIcon }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className={`${portalShell.btnIcon} border-0 ${btnClass}`}
              title={label}
              aria-label={label}
            >
              <ActionIcon size={16} />
            </button>
          ))}
          {primaryAction ? (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className={compact ? `${adminShell.btnCardAction} !py-1.5 !px-3 !text-[9px]` : portalShell.btnCardAction}
            >
              {primaryAction.label}
            </button>
          ) : null}
        </div>
      </div>
    </OutlinedCard>
  );
}

/** Map route advisory status to crisis severity tokens for shared card styling */
export function routeStatusToCardSeverity(routeStatus) {
  if (routeStatus === "Safe") return "Low";
  if (routeStatus === "Caution") return "Medium";
  return "High";
}

/** Map area hazard severity to crisis card severity (pass-through when already aligned) */
export function hazardSeverityToCardSeverity(severity) {
  const s = String(severity || "").toLowerCase();
  if (s.includes("critical") || s.includes("high")) return "High";
  if (s.includes("medium") || s.includes("moderate")) return "Medium";
  return "Low";
}
