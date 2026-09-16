"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { CardIconBox } from "@/app/components/ui/CardIconBox";
import { AlertSeverityIcon } from "@/app/components/ui/cardTypeIcons";
import { getSeverityOutline, iconSize, outlinedCard, typography } from "@/lib/designSystem";

export function CrisisAlertListCard({ alert, onSelect, resolved = false, timeLabel, className = "" }) {
  const styles = getSeverityOutline(alert.severity);
  const typeLabel = alert.type || alert.alert_type || "General";
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "crisis-card-compact",
        hypothesisId: "H1",
        location: "CrisisAlertListCard.jsx:mount",
        message: "Compact crisis list card measured",
        data: {
          alertId: alert.id,
          clientHeight: el.offsetHeight,
          hasMessagePreview: false,
          layout: "route-list-parity",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [alert.id]);

  const card = (
    <div ref={cardRef}>
    <OutlinedCard
      variant="severity"
      severity={alert.severity}
      padding={outlinedCard.alertPadding}
      interactive={Boolean(onSelect)}
      className={`border-2 ${styles.border} ${onSelect ? "cursor-pointer" : ""} text-left ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <CardIconBox boxClass={styles.icon}>
          <AlertSeverityIcon severity={alert.severity} size={iconSize.stat} />
        </CardIconBox>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 mb-2">
            {resolved ? (
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-green-100 text-green-700">
                Resolved
              </span>
            ) : null}
            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${styles.badge}`}>{alert.severity}</span>
            <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-zinc-100 text-zinc-600">
              {resolved ? typeLabel : `Incident: ${typeLabel}`}
            </span>
          </div>
          <h3 className={`${typography.cardTitleBase} ${onSelect ? styles.title : styles.titleStatic}`}>{alert.title}</h3>
          {(alert.location || alert.affected_area) && (
            <p className="text-xs text-zinc-500 font-medium mt-2 flex items-center gap-1.5 uppercase">
              <MapPin size={iconSize.inlineSm} className="shrink-0 text-blue-600" />
              {alert.location || alert.affected_area}
            </p>
          )}
          {(timeLabel || alert.created_at) && (
            <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1 flex items-center gap-1">
              <Clock size={iconSize.inlineSm} />
              {timeLabel ?? new Date(alert.created_at).toLocaleTimeString()}
            </p>
          )}
        </div>
        {onSelect ? <ArrowRight size={16} className={`text-zinc-300 shrink-0 mt-1 ${styles.text}`} /> : null}
      </div>
    </OutlinedCard>
    </div>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(alert)} className="block w-full text-left no-underline group">
        {card}
      </button>
    );
  }

  return card;
}
