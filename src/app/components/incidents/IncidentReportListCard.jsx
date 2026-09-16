"use client";

import Link from "next/link";
import { ArrowRight, Clock, FileText, MapPin } from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { CardIconBox } from "@/app/components/ui/CardIconBox";
import { getStatusColor } from "@/lib/constants";
import { getSeverityOutline, iconSize, outlinedCard, typography } from "@/lib/designSystem";

export function IncidentReportListCard({ incident }) {
  const styles = getSeverityOutline(incident.severity);

  return (
    <Link href={`/crisis/reports/${incident.id}`} className="block w-full text-left no-underline group">
      <OutlinedCard
        variant="severity"
        severity={incident.severity}
        padding={outlinedCard.alertPadding}
        interactive
        className={`border-2 ${styles.border} cursor-pointer text-left`}
      >
        <div className="flex items-start justify-between gap-3">
          <CardIconBox boxClass={styles.icon}>
            <FileText size={iconSize.stat} strokeWidth={2.25} />
          </CardIconBox>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${styles.badge}`}>
                {incident.severity}
              </span>
              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${getStatusColor(incident.status)}`}>
                {incident.status}
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-zinc-100 text-zinc-600 font-mono">
                {incident.reference_number}
              </span>
            </div>
            <h3 className={`${typography.cardTitleBase} ${styles.title}`}>{incident.category}</h3>
            {incident.location && (
              <p className="text-xs text-zinc-500 font-medium mt-2 flex items-center gap-1.5 uppercase">
                <MapPin size={iconSize.inlineSm} className="shrink-0 text-blue-600" />
                {incident.location}
              </p>
            )}
            {incident.created_at && (
              <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1 flex items-center gap-1">
                <Clock size={iconSize.inlineSm} />
                {new Date(incident.created_at).toLocaleString()}
              </p>
            )}
          </div>
          <ArrowRight size={16} className={`text-zinc-300 shrink-0 mt-1 ${styles.text}`} />
        </div>
      </OutlinedCard>
    </Link>
  );
}
