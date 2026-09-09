"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { NotificationItemCard } from "@/app/components/NotificationItemCard";
import { InfoPageHero, PublicPageShell, PublicPageContent, publicLayout } from "@/app/components/InfoPageHero";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { NotificationItemSkeleton } from "@/app/components/ui/Skeletons";
import { getActiveSession } from "@/lib/authSession";
import { getAreaHazardNotificationLink } from "@/lib/travelLinks";

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuthStore();
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

  if (!sessionChecked) {
    return (
      <PublicPageShell>
        <PublicPageContent className="py-16 text-center text-xs font-bold uppercase text-zinc-400">
          Verifying session...
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  if (!isAuthenticated || !user?.id) {
    return (
      <PublicPageShell>
        <PublicPageContent className="text-center py-16">
          <Bell size={40} className="mx-auto mb-4 text-zinc-300" />
          <h1 className="text-xl font-black uppercase text-zinc-900 mb-2">Sign In Required</h1>
          <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
            Private in-app notifications are only available to registered, signed-in users. Public crisis alerts remain available on the Crisis Hub.
          </p>
          <Link href="/login" className="inline-flex text-blue-600 font-black uppercase text-xs px-6 py-3 rounded-full bg-blue-50 border border-blue-100">
            Sign In
          </Link>
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  const getRelatedLink = (n) => {
    if (n.related_type === "incident" && n.related_id) return `/crisis/reports/${n.related_id}`;
    if (n.related_type === "alert") return `/crisis`;
    if (n.related_type === "dangerous_location") {
      return getAreaHazardNotificationLink(n) || "/routes";
    }
    return null;
  };

  return (
    <PublicPageShell>
      <InfoPageHero
        title="Notifications"
        description="Your private updates on crisis alerts, incident reports, and account activity. Public crisis advisories are also available on the Crisis Hub."
      />

      <PublicPageContent>
        <div className="flex items-center justify-end mb-6">
          <button
            type="button"
            onClick={() => markAllAsRead(user.id)}
            className="text-[10px] font-black text-blue-600 uppercase hover:underline"
          >
            Mark all read
          </button>
        </div>

        <AsyncState
          loading={loading}
          error={error}
          isEmpty={!loading && !error && notifications.length === 0}
          onRetry={() => fetchNotifications(user.id)}
          loadingFallback={
            <div className={publicLayout.stackTight}>
              {Array.from({ length: 4 }).map((_, i) => (
                <NotificationItemSkeleton key={i} />
              ))}
            </div>
          }
          emptyFallback={
            <EmptyState icon={Bell} title="No notifications" description="You'll see private updates here when LGU issues crisis alerts or responds to your reports." />
          }
        >
          <div className={publicLayout.stackTight}>
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
      </PublicPageContent>
    </PublicPageShell>
  );
}
