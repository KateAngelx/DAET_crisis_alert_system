import React from "react";
import {
  outlinedCard,
  getStatCardAccent,
  getSeverityOutline,
  getPriorityOutline,
} from "@/lib/designSystem";

export function OutlinedCard({
  variant = "accent",
  accent = "blue",
  severity,
  priority,
  compact = false,
  padding,
  className = "",
  children,
  ...rest
}) {
  let borderClass = "border-zinc-300";

  if (variant === "accent") {
    borderClass = getStatCardAccent(accent).border;
  } else if (variant === "severity") {
    borderClass = getSeverityOutline(severity).border;
  } else if (variant === "priority") {
    borderClass = getPriorityOutline(priority).border;
  }

  const radius = compact ? outlinedCard.radiusCompact : outlinedCard.radius;
  const pad = padding || (compact ? outlinedCard.statPaddingCompact : outlinedCard.statPadding);
  const radiusClass = compact ? radius : "rounded-3xl sm:rounded-[40px]";

  return (
    <div
      className={`${outlinedCard.base} ${radiusClass} ${borderClass} ${pad} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
