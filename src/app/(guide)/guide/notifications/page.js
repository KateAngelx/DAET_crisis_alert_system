"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Bell, Check, AlertTriangle } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { NotificationItemSkeleton } from "@/app/components/ui/Skeletons";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";

export default function GuideNotificationsPage() {
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, loading, error } = useNotificationStore();

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user?.id, fetchNotifications]);

  const getRelatedLink = (n) => {
    if (n.related_type === "incident" && n.related_id) return `/guide/reports/${n.related_id}`;
    if (n.related_type === "alert" && n.related_id) return `/guide/alerts`;
    return null;
  };

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title="Notifications"
        description="Updates on alerts, tour group activity, and incident reports relevant to your guide account."
        action={
          <button
            type="button"
            onClick={() => user?.id && markAllAsRead(user.id)}
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
        onRetry={() => user?.id && fetchNotifications(user.id)}
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
            description="You'll see updates here when alerts are issued or tourists in your groups submit reports."
          />
        }
      >
        <div className="space-y-3">
          {notifications.map((n) => {
            const link = getRelatedLink(n);
            const content = (
              <Card className={`p-5 ${!n.is_read ? "border-l-4 border-l-blue-500 bg-blue-50/30" : "border-zinc-100"}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${n.priority === "CRITICAL" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                    {n.priority === "CRITICAL" ? <AlertTriangle size={16} /> : <Bell size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-zinc-900">{n.title}</h3>
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="text-[10px] font-black text-blue-600 uppercase shrink-0 flex items-center gap-1"
                        >
                          <Check size={12} /> Read
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-zinc-600 mt-1">{n.message}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase mt-2">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            );

            return link ? (
              <Link key={n.id} href={link} className="block no-underline">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      </AsyncState>
    </div>
  );
}
