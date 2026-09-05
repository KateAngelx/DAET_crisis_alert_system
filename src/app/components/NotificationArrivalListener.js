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

const playedNotificationIds = new Set();

function isCrisisAlertNotification(notification) {
  return notification?.notification_type === "crisis_alert" || notification?.related_type === "alert";
}

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

  useEffect(() => {
    if (!latestArrival || !isAuthenticated || user?.role !== "tourist") return;
    if (!isUrgentTouristNotification(latestArrival)) return;
    if (playedNotificationIds.has(latestArrival.id)) return;

    playedNotificationIds.add(latestArrival.id);
    playCrisisNotificationSound();

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => dismissLatestArrival(), 10000);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [latestArrival, isAuthenticated, user?.role, dismissLatestArrival]);

  if (!latestArrival || !isAuthenticated || user?.role !== "tourist") return null;
  if (!isUrgentTouristNotification(latestArrival)) return null;

  const isDanger = isDangerLocationNotification(latestArrival);
  const priority = latestArrival.priority === "CRITICAL" ? "CRITICAL" : "HIGH";

  return (
    <OutlinedCard
      variant="priority"
      priority={priority}
      compact
      padding={outlinedCard.notificationPadding}
      role="status"
      aria-live="polite"
      className="fixed top-20 right-4 z-[60] w-[min(100vw-2rem,22rem)] animate-in slide-in-from-top-2"
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-2xl shrink-0 bg-red-600 text-white">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600">
            {isDanger ? "Unsafe Route Warning" : "New Crisis Alert"}
          </p>
          <p className="font-bold text-sm text-zinc-900 mt-1">{latestArrival.title}</p>
          <p className="text-xs text-zinc-600 mt-1 line-clamp-3">{latestArrival.message}</p>
          <div className="flex items-center gap-3 mt-3">
            <Link
              href={isDanger ? buildAreaHazardTravelLink(latestArrival.related_id) : "/crisis"}
              onClick={() => {
                markAsRead(latestArrival.id);
                dismissLatestArrival();
              }}
              className="text-[10px] font-black uppercase text-blue-600 hover:underline"
            >
              {isDanger ? "View safe route" : "View alert details"}
            </Link>
            <Link
              href="/notifications"
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
