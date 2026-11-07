"use client";

import React, { useEffect, useState } from "react";
import { X, MapPin } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { CardIconBox } from "@/app/components/ui/CardIconBox";
import { AlertSeverityIcon } from "@/app/components/ui/cardTypeIcons";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { geocodeLocation } from "@/lib/geocodeLocation";
import { getSeverityOutline, iconSize } from "@/lib/designSystem";

const DAET_CENTER = [14.1122, 122.9553];

export function AlertDetailModal({ alert, onClose }) {
  const [mapCenter, setMapCenter] = useState(DAET_CENTER);
  const [mapReady, setMapReady] = useState(false);

  const styles = alert ? getSeverityOutline(alert.severity) : null;

  useEffect(() => {
    if (!alert || !mapReady) return;
  }, [alert, mapReady, mapCenter]);

  useEffect(() => {
    if (!alert) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [alert]);

  useEffect(() => {
    if (!alert) {
      setMapReady(false);
      return;
    }

    setMapReady(false);
    let cancelled = false;

    (async () => {
      if (alert.latitude != null && alert.longitude != null) {
        if (!cancelled) {
          const center = [Number(alert.latitude), Number(alert.longitude)];
          setMapCenter(center);
          setMapReady(true);
        }
        return;
      }

      const coords = await geocodeLocation(alert.location);
      if (!cancelled) {
        setMapCenter(coords || DAET_CENTER);
        setMapReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [alert]);

  if (!alert || !styles) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-detail-title"
    >
      <div
        className="relative z-[2001] max-w-2xl w-full max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
      <Card
        className={`p-0 max-h-[90vh] overflow-hidden border-2 ${styles.border} shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col`}
      >
        <div className={`${styles.headerBg} ${styles.headerFg} p-6 sm:p-8 text-left shrink-0 rounded-t-2xl`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${styles.headerIcon}`}>
              <AlertSeverityIcon severity={alert.severity} size={iconSize.empty} />
            </div>
            <button type="button" onClick={onClose} className={styles.headerFg} aria-label="Close">
              <X />
            </button>
          </div>
          <h2 id="alert-detail-title" className={`text-xl sm:text-[26px] font-black uppercase tracking-tighter leading-tight ${styles.headerFg} mb-3`}>
            {alert.title}
          </h2>
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
            <span className={`px-2 py-1 rounded ${styles.headerBadge}`}>{alert.severity}</span>
            <span className={`px-2 py-1 rounded ${styles.headerBadge}`}>{alert.type}</span>
            <span className={`px-2 py-1 rounded ${styles.headerBadge}`}>{alert.location}</span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-5 bg-white text-left overflow-y-auto flex-1">
          <p className="text-sm font-medium leading-relaxed text-zinc-700">{alert.message}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Reported</p>
              <p className="font-bold text-zinc-900">{new Date(alert.created_at).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Status</p>
              <p className="font-bold text-zinc-900 uppercase">{alert.status}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-1.5">
              <MapPin size={iconSize.inlineSm} className={styles.titleStatic} /> Affected area on map
            </p>
            {mapReady ? (
              <CrisisHubMap
                alerts={[alert]}
                warnings={[]}
                showWarnings={false}
                showTouristSpots={false}
                showSafeRoutePins={false}
                showRoutePaths={false}
                showLegend={false}
                center={mapCenter}
                zoom={14}
                heightClass="h-[220px] sm:h-[260px]"
                mapKey={`alert-modal-${alert.id}`}
              />
            ) : (
              <div className="h-[220px] sm:h-[260px] rounded-3xl border border-zinc-200 bg-zinc-100 animate-pulse flex items-center justify-center">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Loading map…</p>
              </div>
            )}
            <p className="text-[10px] text-zinc-400 font-medium">
              Pin shows the reported affected area for this alert. Follow tourism office instructions on the ground.
            </p>
          </div>

          <div className={`p-5 rounded-2xl border flex items-start gap-4 ${styles.ctaBg}`}>
            <CardIconBox boxClass={styles.icon}>
              <AlertSeverityIcon severity={alert.severity} size={iconSize.auth} />
            </CardIconBox>
            <div>
              <p className={`text-xs font-black uppercase tracking-widest mb-1 ${styles.ctaLabel}`}>Recommended Actions</p>
              <p className={`text-sm font-medium leading-relaxed ${styles.ctaBody}`}>
                Follow the instructions above. Avoid the affected area ({alert.location}) until this alert is marked Resolved. For immediate danger, call 911 or 117.
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 bg-white rounded-b-2xl border-t border-zinc-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest"
          >
            Acknowledge & Close
          </button>
        </div>
      </Card>
      </div>
    </div>
  );
}
