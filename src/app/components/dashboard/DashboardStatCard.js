import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { typography, iconSize, statCard } from "@/lib/designSystem";

const ACCENT_STYLES = {
  blue: { icon: "bg-blue-100 text-blue-600", value: "text-zinc-900" },
  red: { icon: "bg-red-100 text-red-600", value: "text-red-600", card: "bg-red-50/50 border-red-100" },
  orange: { icon: "bg-orange-100 text-orange-600", value: "text-orange-600" },
  purple: { icon: "bg-purple-100 text-purple-600", value: "text-purple-600" },
  green: { icon: "bg-green-100 text-green-600", value: "text-green-600" },
};

export function DashboardStatCard({
  label,
  value,
  icon,
  accent = "blue",
  href,
  hrefLabel = "View",
  badge,
}) {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.blue;

  return (
    <Card className={`${statCard.dashboard} ${styles.card || ""}`}>
      <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
        <div className={`${statCard.iconWrap} ${styles.icon}`}>
          {icon}
        </div>
        <div className="flex flex-col items-end gap-1 min-w-0">
          {badge && (
            <span className={`${typography.statLabel} text-green-600 truncate max-w-full`}>{badge}</span>
          )}
          {href && (
            <Link
              href={href}
              className={`${typography.statLabel} text-blue-600 flex items-center gap-1 hover:underline shrink-0`}
            >
              {hrefLabel} <ArrowRight size={iconSize.inlineSm} />
            </Link>
          )}
        </div>
      </div>
      <p className={`${typography.statLabel} text-zinc-400 mb-1 truncate`}>{label}</p>
      <p className={`${typography.statValue} ${styles.value} break-words`}>{value}</p>
    </Card>
  );
}
