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
import { NotificationItemSkeleton, SessionInboxSkeleton } from "@/app/components/ui/Skeletons";
import { getActiveSession } from "@/lib/authSession";
import { getNotificationHref } from "@/lib/notificationLinks";
import { splitRewardNotifications } from "@/lib/notificationCategory";
import { portalShell, portalLayout } from "@/lib/designSystem";
import { ListPager } from "@/app/components/shell/ListPager";

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, dismissNotification, loading, error, clearNotifications } =
    useNotificationStore();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("updates");

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
        <PublicPageContent>
          <PublicPanel title="Inbox" bodyClassName={portalLayout.panelBodyStack}>
            <SessionInboxSkeleton count={4} />
          </PublicPanel>
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
              In-app notifications are only available to registered, signed-in users. Public crisis alerts stay on the Alerts page.
            </p>
            <Link href="/login" className={portalShell.btnPrimary}>
              Sign in
            </Link>
          </PublicPanel>
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  const getRelatedLink = (n) => getNotificationHref(n, user?.role);
  const dismissedItems = notifications.filter((n) => n.dismissed_at);
  const { updates, rewards } = splitRewardNotifications(notifications.filter((n) => !n.dismissed_at));
  const tabItems = tab === "rewards" ? rewards : tab === "dismissed" ? dismissedItems : updates;
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(tabItems.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleNotifications = tabItems.slice((safePage - 1) * pageSize, safePage * pageSize);
  const tabs = [
    { key: "updates", label: "Alerts & updates", count: updates.length },
    { key: "rewards", label: "Rewards", count: rewards.length },
    ...(dismissedItems.length || tab === "dismissed"
      ? [{ key: "dismissed", label: "Dismissed", count: dismissedItems.length }]
      : []),
  ];

  return (
    <PublicPageShell>
      <InfoPageHero
        title="Notifications"
        description="Your own updates about alerts, your reports, and your account. Public alerts are also on the Alerts page."
      />

      <PublicPageContent>
        <PublicPanel
          title="Inbox"
          subtitle={`${tabItems.length} notification${tabItems.length === 1 ? "" : "s"}`}
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
          <div className="flex gap-2" role="tablist" aria-label="Notification type">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
                className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide transition-colors ${
                  tab === t.key
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
          <AsyncState
            loading={loading}
            error={error}
            isEmpty={!loading && !error && tabItems.length === 0}
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
                title={tab === "rewards" ? "No rewards yet" : tab === "dismissed" ? "Nothing dismissed" : "No notifications"}
                description={
                  tab === "rewards"
                    ? "Points you earn appear here, separate from crisis alerts."
                    : tab === "dismissed"
                      ? "Alert notices you mark as not affecting you appear here."
                      : "You'll see private updates here when the tourism office issues crisis alerts or responds to your reports."
                }
              />
            }
          >
            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {visibleNotifications.map((n) => (
                <li key={n.id}>
                  <NotificationItemCard
                    notification={n}
                    variant="row"
                    relatedLink={getRelatedLink(n)}
                    onMarkRead={markAsRead}
                    onDismiss={dismissNotification}
                  />
                </li>
              ))}
            </ul>
            <ListPager page={safePage} pageCount={pageCount} onPage={setPage} />
          </AsyncState>
        </PublicPanel>
      </PublicPageContent>
    </PublicPageShell>
  );
}
