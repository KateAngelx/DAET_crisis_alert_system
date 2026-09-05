import React from "react";
import { Card } from "@/app/components/ui/Card";
import { typography, statCard } from "@/lib/designSystem";

const ACCENT_VALUE = {
  zinc: "text-zinc-900",
  red: "text-red-600",
  green: "text-green-600",
  blue: "text-blue-600",
};

const ACCENT_CARD = {
  zinc: "bg-zinc-50 border-zinc-200",
  red: "bg-red-50 border-red-100",
  green: "bg-green-50 border-green-100",
  blue: "bg-blue-50 border-blue-100",
};

const ACCENT_LABEL = {
  zinc: "text-zinc-400",
  red: "text-red-600",
  green: "text-green-600",
  blue: "text-blue-600",
};

export function PublicStatCard({ value, label, accent = "zinc", className = "" }) {
  return (
    <Card className={`${statCard.public} rounded-3xl border min-w-0 ${ACCENT_CARD[accent] || ACCENT_CARD.zinc} ${className}`}>
      <p className={`${typography.statValueLg} mb-3 sm:mb-4 break-words ${ACCENT_VALUE[accent] || ACCENT_VALUE.zinc}`}>
        {value}
      </p>
      <p className={`${typography.statLabel} tracking-[0.2em] ${ACCENT_LABEL[accent] || ACCENT_LABEL.zinc}`}>
        {label}
      </p>
    </Card>
  );
}
