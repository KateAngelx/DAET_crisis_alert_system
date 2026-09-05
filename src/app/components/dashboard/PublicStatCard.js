import React from "react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { typography, getStatCardAccent } from "@/lib/designSystem";

export function PublicStatCard({ value, label, accent = "blue", compact = false, className = "" }) {
  const styles = getStatCardAccent(accent);
  const labelClass = compact
    ? `${typography.statLabel} text-[9px] sm:text-[10px] leading-tight tracking-wide`
    : typography.statLabel;
  const valueClass = compact
    ? "text-xl sm:text-2xl font-black leading-none"
    : typography.statValue;

  return (
    <OutlinedCard accent={accent} compact={compact} className={className}>
      <p className={`${labelClass} ${styles.label} mb-1 line-clamp-2`}>{label}</p>
      <p className={`${valueClass} ${styles.value} break-words`}>{value}</p>
    </OutlinedCard>
  );
}
