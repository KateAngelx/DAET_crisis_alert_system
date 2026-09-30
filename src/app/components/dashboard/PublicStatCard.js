import React from "react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { typography, getStatCardAccent } from "@/lib/designSystem";

export function PublicStatCard({ value, label, accent = "blue", compact = false, className = "" }) {
  const styles = getStatCardAccent(accent);
  const labelClass = compact
    ? "text-[8px] sm:text-[10px] font-black uppercase leading-tight tracking-tight sm:tracking-widest line-clamp-3"
    : `${typography.statLabel} line-clamp-2`;
  const valueClass = compact
    ? "text-lg sm:text-2xl font-bold leading-none tabular-nums"
    : `${typography.statValue} tabular-nums`;

  return (
    <OutlinedCard accent={accent} compact={compact} className={className}>
      <p className={`${labelClass} ${styles.label} mb-1`}>{label}</p>
      <p className={`${valueClass} ${styles.value} break-words`}>{value}</p>
    </OutlinedCard>
  );
}
