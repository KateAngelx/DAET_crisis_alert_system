"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { NotificationItemCard } from "@/app/components/NotificationItemCard";
import {
  InfoPageHero,
  PublicPageShell,
  PublicPageContent,
  PublicPanel,
  publicLayout,
} from "@/app/components/InfoPageHero";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { NotificationItemSkeleton } from "@/app/components/ui/Skeletons";
import { getActiveSession } from "@/lib/authSession";
import { getAreaHazardNotificationLink } from "@/lib/travelLinks";
import { portalShell, portalLayout } from "@/lib/designSystem";
import { PublicCardListPreview } from "@/app/components/shell/PublicCardListPreview";

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, loading, error, clearNotifications } =
    useNotificationStore();
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
        <InfoPageHero title="Notifications" description="Loading your inbox…" />
        <PublicPageContent className="text-center text-xs font-bold uppercase text-zinc-400 py-8">
          Verifying session...
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  if (!isAuthenticated || !user?.id) {
    return (
      <PublicPageShell>
        <InfoPageHero
          title="Notifications"
          description="Private updates on alerts, reports, and account activity."
        />
        <PublicPageContent>
          <PublicPanel title="Sign in required">
            <Bell size={32} className="mb-3 text-zinc-300" />
            <p className="text-sm text-zinc-600 font-medium mb-4 max-w-md">
              In-app notifications are only available to registered, signed-in users. Public crisis alerts remain on the Crisis Hub.
            </p>
            <Link href="/login" className={portalShell.btnPrimary}>
              Sign in
            </Link>
          </PublicPanel>
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
        <PublicPanel
          title="Inbox"
          subtitle={`${notifications.length} notification${notifications.length === 1 ? "" : "s"}`}
          bodyClassName={portalLayout.panelBodyStack}
          action={
            <button
              type="button"
              onClick={() => markAllAsRead(user.id)}
              className="text-[10px] font-black text-blue-600 uppercase hover:underline"
            >
              Mark all read
            </button>
          }
        >
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
              <EmptyState
                icon={Bell}
                title="No notifications"
                description="You'll see private updates here when the tourism office issues crisis alerts or responds to your reports."
              />
            }
          >
            <PublicCardListPreview
              items={notifications}
              modalTitle="Notifications"
              modalSubtitle={`${notifications.length} total`}
              scrollPaneClassName={portalLayout.listScrollPane}
              renderItem={(n) => (
                <NotificationItemCard
                  notification={n}
                  variant="list"
                  relatedLink={getRelatedLink(n)}
                  onMarkRead={markAsRead}
                />
              )}
            />
          </AsyncState>
        </PublicPanel>
      </PublicPageContent>
    </PublicPageShell>
  );
}
