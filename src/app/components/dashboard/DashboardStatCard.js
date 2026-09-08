import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { typography, iconSize, statCard, getStatCardAccent } from "@/lib/designSystem";

export function DashboardStatCard({
  label,
  value,
  icon,
  accent = "blue",
  href,
  hrefLabel = "View",
  badge,
  footerLink = false,
  subtext,
  compact = false,
}) {
  const styles = getStatCardAccent(accent);
  const showIconRow = icon || badge || (href && !footerLink);

  const cardBody = (
    <>
      {showIconRow && (
        <div className={statCard.iconRow}>
          {icon ? (
            <div className={`${statCard.iconWrap} ${styles.icon}`}>
              {icon}
            </div>
          ) : (
            <span className="shrink-0" />
          )}
          <div className="flex flex-col items-end gap-0.5 sm:gap-1 min-w-0">
            {badge && (
              <span className={`${typography.statLabel} text-[8px] sm:text-[10px] text-green-600 truncate max-w-full`}>
                {badge}
              </span>
            )}
            {href && !footerLink && (
              <Link
                href={href}
                className={`${typography.statLabel} text-[8px] sm:text-[10px] text-blue-600 flex items-center gap-0.5 sm:gap-1 hover:underline shrink-0`}
              >
                {hrefLabel} <ArrowRight size={iconSize.inlineSm} className="shrink-0" />
              </Link>
            )}
          </div>
        </div>
      )}
      <p className={`${statCard.label} ${styles.label} mb-0.5 sm:mb-1`}>{label}</p>
      <p className={`${typography.statValue} ${styles.value} break-words tabular-nums`}>{value}</p>
      {subtext ? (
        <p className="text-[9px] sm:text-[10px] text-zinc-400 mt-1 font-medium leading-tight line-clamp-2">
          {subtext}
        </p>
      ) : null}
      {href && footerLink && (
        <div className="flex items-center justify-between mt-2 sm:mt-3 pt-1">
          <span className={`${typography.badge} tracking-widest ${styles.footer}`}>{hrefLabel}</span>
          <div className={`size-1.5 sm:size-2 rounded-full ${styles.dot}`} />
        </div>
      )}
    </>
  );

  if (href && footerLink) {
    return (
      <Link
        href={href}
        className="block no-underline min-w-0 group transition-all hover:-translate-y-0.5"
      >
        <OutlinedCard accent={accent} compact={compact} className="group-hover:shadow-2xl h-full">
          {cardBody}
        </OutlinedCard>
      </Link>
    );
  }

  return (
    <OutlinedCard accent={accent} compact={compact} className="h-full">
      {cardBody}
    </OutlinedCard>
  );
}
