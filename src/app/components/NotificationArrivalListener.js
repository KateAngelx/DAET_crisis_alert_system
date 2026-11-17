"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { outlinedCard } from "@/lib/designSystem";
import { unlockNotificationSound, playCrisisNotificationSound } from "@/lib/notificationSound";
import { buildAreaHazardTravelLink, isAreaHazardNotification } from "@/lib/travelLinks";
import { getNotificationHref, getNotificationInboxHref } from "@/lib/notificationLinks";
import {
  getNotificationSeverity,
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

export function NotificationArrivalListener() {
  const { isAuthenticated, user } = useAuthStore();
  const { latestArrival, dismissLatestArrival, markAsRead } = useNotificationStore();
  const dismissTimerRef = useRef(null);

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
    if (playedNotificationIds.has(latestArrival.id)) return;

    playedNotificationIds.add(latestArrival.id);
    const urgent = userRole === "tourist" && isUrgentTouristNotification(latestArrival);
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
      : isDanger
        ? "Unsafe Route Warning"
        : isAlert
          ? `New ${level || ""} Crisis Alert`.replace(/\s+/g, " ")
          : "New notification";
  const detailLabel = isDanger ? "View safe route" : isAlert ? "View alert details" : "Open notification";

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
      className="fixed top-20 right-4 z-[80] w-[min(100vw-2rem,22rem)] animate-in slide-in-from-top-2"
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
