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
}) {
  const styles = getStatCardAccent(accent);

  const cardBody = (
    <>
      {(icon || badge || (href && !footerLink)) && (
        <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
          {icon ? (
            <div className={`${statCard.iconWrap} ${styles.icon}`}>
              {icon}
            </div>
          ) : (
            <span className="shrink-0" />
          )}
          <div className="flex flex-col items-end gap-1 min-w-0">
            {badge && (
              <span className={`${typography.statLabel} text-green-600 truncate max-w-full`}>{badge}</span>
            )}
            {href && !footerLink && (
              <Link
                href={href}
                className={`${typography.statLabel} text-blue-600 flex items-center gap-1 hover:underline shrink-0`}
              >
                {hrefLabel} <ArrowRight size={iconSize.inlineSm} />
              </Link>
            )}
          </div>
        </div>
      )}
      <p className={`${typography.statLabel} ${styles.label} mb-1 truncate`}>{label}</p>
      <p className={`${typography.statValue} ${styles.value} break-words`}>{value}</p>
      {href && footerLink && (
        <div className="flex items-center justify-between mt-3 pt-1">
          <span className={`${typography.badge} tracking-widest ${styles.footer}`}>{hrefLabel}</span>
          <div className={`size-2 rounded-full ${styles.dot}`} />
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
        <OutlinedCard accent={accent} className="group-hover:shadow-2xl">
          {cardBody}
        </OutlinedCard>
      </Link>
    );
  }

  return (
    <OutlinedCard accent={accent}>
      {cardBody}
    </OutlinedCard>
  );
}
