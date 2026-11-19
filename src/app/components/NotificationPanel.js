"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { NotificationPanelSkeleton } from "@/app/components/ui/Skeletons";
import { NotificationItemCard } from "@/app/components/NotificationItemCard";
import { getActiveSession } from "@/lib/authSession";
import { getNotificationHref, getNotificationInboxHref } from "@/lib/notificationLinks";
import { splitRewardNotifications } from "@/lib/notificationCategory";
import { iconSize } from "@/lib/designSystem";
import { ListPager } from "@/app/components/shell/ListPager";

export function NotificationPanel() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    notifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    loading,
    error,
    clearNotifications,
  } = useNotificationStore();
  const [open, setOpen] = useState(false);
  // Which signed-in user the bell has confirmed a session for.
  const [readyFor, setReadyFor] = useState(null);
  const sessionReady = Boolean(user?.id) && readyFor === user.id;
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadForSession() {
      const session = await getActiveSession();
      if (cancelled) return;

      if (!session?.user?.id) {
        clearNotifications();
        setReadyFor(null);
        return;
      }

      setReadyFor(session.user.id);
      await fetchNotifications(session.user.id);
    }

    if (isAuthenticated && user?.id) {
      loadForSession();
    } else {
      clearNotifications();
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, fetchNotifications, clearNotifications]);

  if (!isAuthenticated || !sessionReady || !user?.id) return null;

  const getRelatedLink = (notification) => getNotificationHref(notification, user?.role);
  // The bell shows alerts and updates only; rewards are on the full Notifications page.
  // Dismissed ("not affected") notices stay on the full Notifications page only.
  const { updates } = splitRewardNotifications(notifications.filter((n) => !n.dismissed_at));
  const updateUnreadCount = updates.filter((n) => !n.is_read).length;
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(updates.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleNotifications = updates.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
        aria-label={`${updateUnreadCount} unread notifications`}
      >
        <Bell size={iconSize.nav} className="text-zinc-600" />
        {updateUnreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center border-2 border-white">
            {updateUnreadCount > 9 ? "9+" : updateUnreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="z-50 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg max-lg:fixed max-lg:inset-x-3 max-lg:top-[calc(4rem+env(safe-area-inset-top,0px))] max-lg:w-auto lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-1.5 lg:w-[min(calc(100vw-1.5rem),20rem)]">
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-zinc-100">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-zinc-800">Notifications</h3>
              <div className="flex items-center gap-1">
                {updateUnreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead(user.id)}
                    className="text-[9px] font-bold text-blue-600 uppercase hover:underline"
                  >
                    All read
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} className="p-0.5 hover:bg-zinc-100 rounded" aria-label="Close notifications">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100">
              {loading ? (
                <NotificationPanelSkeleton count={4} />
              ) : error ? (
                <div className="px-3 py-4 text-center">
                  <AlertTriangle size={16} className="mx-auto text-red-400 mb-1" />
                  <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Failed to load</p>
                  <button
                    type="button"
                    onClick={() => fetchNotifications(user.id)}
                    className="text-[9px] font-black text-blue-600 uppercase hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : updates.length === 0 ? (
                <div className="px-3 py-5 text-center text-zinc-400">
                  <Bell size={16} className="mx-auto mb-1 opacity-40" />
                  <p className="text-[10px] font-bold uppercase">No notifications</p>
                </div>
              ) : (
                visibleNotifications.map((n) => (
                  <NotificationItemCard
                    key={n.id}
                    notification={n}
                    compact
                    relatedLink={getRelatedLink(n)}
                    onMarkRead={markAsRead}
                    onDismiss={dismissNotification}
                    onNavigate={() => setOpen(false)}
                  />
                ))
              )}
            </div>
            <ListPager page={safePage} pageCount={pageCount} onPage={setPage} />

            <div className="px-2.5 py-1.5 border-t border-zinc-100 text-center">
              <Link
                href={getNotificationInboxHref(user?.role)}
                onClick={() => setOpen(false)}
                className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
              >
                View all
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
