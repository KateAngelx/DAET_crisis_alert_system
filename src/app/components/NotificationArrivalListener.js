"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, Phone, ShieldAlert, X } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { outlinedCard } from "@/lib/designSystem";
import { unlockNotificationSound, playCrisisNotificationSound, startCriticalAlarm } from "@/lib/notificationSound";
import { buildAreaHazardTravelLink, isAreaHazardNotification } from "@/lib/travelLinks";
import { getNotificationHref, getNotificationInboxHref } from "@/lib/notificationLinks";
import {
  getNotificationSeverity,
  isCriticalArrival,
  isCrisisAlertNotification,
  isRewardNotification,
} from "@/lib/notificationCategory";

/** Pop-up colors per level, using the system palette (red error, yellow warning, green success, blue primary). */
const ARRIVAL_TONES = {
  Critical: { icon: "bg-red-600 text-white", eyebrow: "text-red-600" },
  High: { icon: "bg-orange-500 text-white", eyebrow: "text-orange-600" },
  Medium: { icon: "bg-yellow-500 text-zinc-900", eyebrow: "text-yellow-700" },
  Low: { icon: "bg-blue-600 text-white", eyebrow: "text-blue-600" },
  Resolved: { icon: "bg-green-500 text-white", eyebrow: "text-green-700" },
  default: { icon: "bg-blue-600 text-white", eyebrow: "text-blue-600" },
};

const playedNotificationIds = new Set();

function isDangerLocationNotification(notification) {
  return isAreaHazardNotification(notification);
}

function isUrgentTouristNotification(notification) {
  return isCrisisAlertNotification(notification) || isDangerLocationNotification(notification);
}

function isAdminActionNotification(notification, role) {
  if (role !== "admin") return false;
  const type = String(notification?.notification_type || "");
  const related = String(notification?.related_type || "");
  if (type === "incident_submitted" || related === "incident") return true;
  if (related === "tourist_guide_assistance" || type.startsWith("tourist_guide_assistance")) return true;
  if (related === "guide_emergency" || type.startsWith("guide_emergency")) return true;
  if (related === "missing_person" || type.startsWith("missing_person")) return true;
  return false;
}

function adminArrivalEyebrow(notification) {
  const type = String(notification?.notification_type || "");
  const related = String(notification?.related_type || "");
  if (type === "incident_submitted" || related === "incident") return "New incident report";
  if (related === "tourist_guide_assistance" || type.startsWith("tourist_guide_assistance")) return "New help request";
  if (related === "guide_emergency" || type.startsWith("guide_emergency")) return "Guide emergency report";
  if (related === "missing_person" || type.startsWith("missing_person")) return "Missing person report";
  return "Admin action needed";
}

function adminArrivalActionLabel(notification) {
  const type = String(notification?.notification_type || "");
  const related = String(notification?.related_type || "");
  if (type === "incident_submitted" || related === "incident") return "Review report";
  if (related === "tourist_guide_assistance" || type.startsWith("tourist_guide_assistance")) return "Open help requests";
  if (related === "guide_emergency" || type.startsWith("guide_emergency")) return "Open command center";
  if (related === "missing_person" || type.startsWith("missing_person")) return "Review case";
  return "Open";
}

export function NotificationArrivalListener() {
  const { isAuthenticated, user } = useAuthStore();
  const { latestArrival, dismissLatestArrival, markAsRead } = useNotificationStore();
  const dismissTimerRef = useRef(null);
  const stopAlarmRef = useRef(null);

  useEffect(() => {
    const unlock = () => unlockNotificationSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;
  const pushEnabled = Boolean(user?.notification_channels?.push);

  useEffect(() => {
    if (!latestArrival || !isAuthenticated || !userId) return;
    // Rewards have their own toast; never show them as a red alert popup.
    if (isRewardNotification(latestArrival)) {
      dismissLatestArrival();
      return;
    }
    // Critical: siren + vibration, no auto-close. Stopped when the pop-up closes.
    if (isCriticalArrival(latestArrival, userRole)) {
      stopAlarmRef.current = startCriticalAlarm({ durationMs: 8000 });
      return () => {
        stopAlarmRef.current?.();
        stopAlarmRef.current = null;
      };
    }

    if (playedNotificationIds.has(latestArrival.id)) return;
    playedNotificationIds.add(latestArrival.id);

    const urgent =
      (userRole === "tourist" && isUrgentTouristNotification(latestArrival))
      || isAdminActionNotification(latestArrival, userRole);
    const pushCanPlaySystemSound =
      urgent
      && pushEnabled
      && typeof Notification !== "undefined"
      && Notification.permission === "granted";
    if (urgent && !pushCanPlaySystemSound) playCrisisNotificationSound();

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => dismissLatestArrival(), 10000);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [latestArrival, isAuthenticated, userId, userRole, pushEnabled, dismissLatestArrival]);

  if (!latestArrival || !isAuthenticated || !user?.id) return null;
  if (isRewardNotification(latestArrival)) return null;

  const isDanger = isDangerLocationNotification(latestArrival);
  const isAlert = isCrisisAlertNotification(latestArrival);
  const isAdminAction = isAdminActionNotification(latestArrival, user.role);
  const priority = latestArrival.priority === "CRITICAL" || latestArrival.priority === "HIGH"
    ? latestArrival.priority
    : "NORMAL";
  // Same color as the alert, hazard or road card this notice links to.
  const level = getNotificationSeverity(latestArrival);
  const isAlertLevel = Boolean(level) && level !== "Resolved";
  const detailHref = isDanger
    ? buildAreaHazardTravelLink(latestArrival.related_id)
    : getNotificationHref(latestArrival, user.role) || getNotificationInboxHref(user.role);
  const inboxHref = getNotificationInboxHref(user.role);
  const tone = ARRIVAL_TONES[level] || ARRIVAL_TONES.default;
  const eyebrow =
    level === "Resolved"
      ? "Resolved"
      : isAdminAction
        ? adminArrivalEyebrow(latestArrival)
        : isDanger
          ? "Unsafe Route Warning"
          : isAlert
            ? `New ${level || ""} Crisis Alert`.replace(/\s+/g, " ")
            : "New notification";
  const detailLabel = isAdminAction
    ? adminArrivalActionLabel(latestArrival)
    : isDanger
      ? "View safe route"
      : isAlert
        ? "View alert details"
        : "Open notification";

  if (isCriticalArrival(latestArrival, user.role)) {
    const close = () => {
      stopAlarmRef.current?.();
      stopAlarmRef.current = null;
      dismissLatestArrival();
    };
    return (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-red-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="critical-arrival-title"
          aria-describedby="critical-arrival-message"
          className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-4 ring-red-500 animate-in zoom-in-95 duration-200"
        >
          <div className="flex items-center gap-3 bg-red-600 px-5 py-4 text-white">
            <ShieldAlert size={28} className="shrink-0 animate-pulse" />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-100">
                {isDanger ? "Critical area hazard" : "Critical alert"}
              </p>
              <h2 id="critical-arrival-title" className="text-lg font-black leading-tight">{latestArrival.title}</h2>
            </div>
          </div>
          <div className="space-y-4 px-5 py-5">
            <p id="critical-arrival-message" className="text-sm font-medium leading-relaxed text-zinc-800">
              {latestArrival.message}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href={detailHref}
                onClick={() => {
                  markAsRead(latestArrival.id);
                  close();
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-red-600 px-4 text-xs font-black uppercase tracking-widest text-white hover:bg-red-700"
              >
                {isDanger ? "See safe route" : "What to do"}
              </Link>
              <a
                href="tel:911"
                onClick={() => stopAlarmRef.current?.()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-red-200 px-4 text-xs font-black uppercase tracking-widest text-red-700 hover:bg-red-50"
              >
                <Phone size={14} /> Call 911
              </a>
            </div>
            <button
              type="button"
              onClick={() => {
                markAsRead(latestArrival.id);
                close();
              }}
              className="w-full rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100"
            >
              I&apos;ve seen it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OutlinedCard
      {...(isAlertLevel
        ? { variant: "severity", severity: level }
        : level === "Resolved"
          ? { variant: "accent", accent: "green" }
          : { variant: "priority", priority })}
      compact
      padding={outlinedCard.notificationPadding}
      role="status"
      aria-live="polite"
      className="fixed z-[80] animate-in slide-in-from-top-2 max-lg:inset-x-3 max-lg:top-[calc(4rem+env(safe-area-inset-top,0px))] max-lg:w-auto lg:left-auto lg:right-4 lg:top-20 lg:w-[min(100vw-2rem,22rem)]"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-2xl shrink-0 ${tone.icon}`}>
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-widest ${tone.eyebrow}`}>
            {eyebrow}
          </p>
          <p className="font-bold text-sm text-zinc-900 mt-1">{latestArrival.title}</p>
          <p className="text-xs text-zinc-600 mt-1 line-clamp-3">{latestArrival.message}</p>
          <div className="flex items-center gap-3 mt-3">
            <Link
              href={detailHref}
              onClick={() => {
                markAsRead(latestArrival.id);
                dismissLatestArrival();
              }}
              className="text-[10px] font-black uppercase text-blue-600 hover:underline"
            >
              {detailLabel}
            </Link>
            <Link
              href={inboxHref}
              onClick={() => dismissLatestArrival()}
              className="text-[10px] font-black uppercase text-zinc-500 hover:underline"
            >
              All notifications
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dismissLatestArrival()}
          className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400"
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      </div>
    </OutlinedCard>
  );
}
