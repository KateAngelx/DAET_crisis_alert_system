"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { unlockNotificationSound, playCrisisNotificationSound } from "@/lib/notificationSound";

const playedNotificationIds = new Set();

function isCrisisAlertNotification(notification) {
  return notification?.notification_type === "crisis_alert" || notification?.related_type === "alert";
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
    if (!isCrisisAlertNotification(latestArrival)) return;
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
  if (!isCrisisAlertNotification(latestArrival)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 right-4 z-[60] w-[min(100vw-2rem,22rem)] rounded-2xl border border-red-200 bg-white shadow-2xl overflow-hidden animate-in slide-in-from-top-2"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="p-2 rounded-xl bg-red-100 text-red-600 shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600">New Crisis Alert</p>
          <p className="font-bold text-sm text-zinc-900 mt-1">{latestArrival.title}</p>
          <p className="text-xs text-zinc-600 mt-1 line-clamp-3">{latestArrival.message}</p>
          <div className="flex items-center gap-3 mt-3">
            <Link
              href="/crisis/alerts"
              onClick={() => {
                markAsRead(latestArrival.id);
                dismissLatestArrival();
              }}
              className="text-[10px] font-black uppercase text-blue-600 hover:underline"
            >
              View alert details
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
    </div>
  );
}
