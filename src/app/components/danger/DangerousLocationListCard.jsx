"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { CardIconBox } from "@/app/components/ui/CardIconBox";
import { DangerSeverityIcon } from "@/app/components/ui/cardTypeIcons";
import { formatWarningTimeRange, getDangerSeverityStyles } from "@/lib/dangerousLocationUtils";
import { iconSize, outlinedCard, typography } from "@/lib/designSystem";

export function DangerousLocationListCard({ warning, highlighted = false }) {
  const styles = getDangerSeverityStyles(warning.severity);
  const href = `/routes?hazard=${warning.id}`;

  const card = (
    <OutlinedCard
      padding={outlinedCard.alertPadding}
      interactive
      className={`border-2 ${styles.border} cursor-pointer text-left`}
    >
      <div className="flex items-start justify-between gap-3">
        <CardIconBox boxClass={styles.icon}>
          <DangerSeverityIcon severity={warning.severity} size={iconSize.stat} />
        </CardIconBox>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${styles.badge}`}>
              {styles.label}
            </span>
            <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-zinc-100 text-zinc-600">
              {warning.danger_type}
            </span>
          </div>
          <h3 className={`${typography.cardTitleBase} ${styles.title}`}>{warning.dangerous_location}</h3>
          <p className="text-[10px] text-zinc-400 font-bold uppercase mt-2 flex items-center gap-1">
            <Clock size={iconSize.inlineSm} />
            {formatWarningTimeRange(warning)}
          </p>
        </div>
        <ArrowRight size={16} className={`text-zinc-300 shrink-0 mt-1 ${styles.text}`} />
      </div>
    </OutlinedCard>
  );

  return (
    <div
      id={`hazard-${warning.id}`}
      className={highlighted ? "rounded-2xl ring-2 ring-blue-500 ring-offset-2" : undefined}
    >
      <Link href={href} className="block w-full text-left no-underline group">
        {card}
      </Link>
    </div>
  );
}
