"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { NotificationItemCard } from "@/app/components/NotificationItemCard";
import { getAreaHazardNotificationLink } from "@/lib/travelLinks";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { NotificationItemSkeleton } from "@/app/components/ui/Skeletons";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { getActiveSession } from "@/lib/authSession";
import { GuideDashboardQuickActions } from "@/app/components/guide/GuideDashboardQuickActions";

export default function GuideNotificationsPage() {
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, loading, error, clearNotifications } = useNotificationStore();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAndLoad() {
      const session = await getActiveSession();
      if (cancelled) return;

      if (!session?.user?.id) {
        clearNotifications();
        setSessionChecked(true);
        return;
      }

      await fetchNotifications(session.user.id);
      setSessionChecked(true);
    }

    verifyAndLoad();

    return () => {
      cancelled = true;
    };
  }, [fetchNotifications, clearNotifications]);

  const getRelatedLink = (n) => {
    if (n.related_type === "incident" && n.related_id) return `/guide/reports/${n.related_id}`;
    if (n.related_type === "alert") return `/guide/crisis`;
    if (n.related_type === "dangerous_location") {
      return getAreaHazardNotificationLink(n, { prefix: "/guide" }) || "/guide/routes";
    }
    return null;
  };

  if (!sessionChecked) {
    return (
      <div className="py-16 text-center text-xs font-bold uppercase text-zinc-400">
        Verifying session...
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-zinc-500 mb-4">Sign in to view your private notifications.</p>
        <Link href="/login" className="text-blue-600 font-black uppercase text-xs">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title="Notifications"
        description="Private updates on alerts, tour group activity, and incident reports for your guide account."
        action={
          <button
            type="button"
            onClick={() => markAllAsRead(user.id)}
            className="text-[10px] font-black text-blue-600 uppercase hover:underline"
          >
            Mark all read
          </button>
        }
      />

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!loading && !error && notifications.length === 0}
        onRetry={() => fetchNotifications(user.id)}
        loadingFallback={
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <NotificationItemSkeleton key={i} />
            ))}
          </div>
        }
        emptyFallback={
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You'll see private updates here when alerts are issued or tourists in your groups submit reports."
          />
        }
      >
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotificationItemCard
              key={n.id}
              notification={n}
              relatedLink={getRelatedLink(n)}
              onMarkRead={markAsRead}
            />
          ))}
        </div>
      </AsyncState>

      <GuideDashboardQuickActions className="mt-6" />
    </div>
  );
}
