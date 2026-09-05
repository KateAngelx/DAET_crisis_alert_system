"use client";

import React, { useEffect } from 'react';
import { Bell, Check, AlertTriangle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { useAuthStore } from '@/app/store/crisisStore';
import { useNotificationStore } from '@/app/store/notificationStore';
import Link from 'next/link';
import { InfoPageHero, PublicPageShell, PublicPageContent, publicLayout } from '@/app/components/InfoPageHero';
import { AsyncState, EmptyState } from '@/app/components/ui/AsyncState';
import { NotificationItemSkeleton } from '@/app/components/ui/Skeletons';

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, loading, error } = useNotificationStore();

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user?.id, fetchNotifications]);

  if (!isAuthenticated) {
    return (
      <PublicPageShell>
        <PublicPageContent className="text-center">
          <Link href="/login" className="text-blue-600 font-bold uppercase text-xs">Sign In Required</Link>
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  const getRelatedLink = (n) => {
    if (n.related_type === 'incident' && n.related_id) return `/crisis/reports/${n.related_id}`;
    return null;
  };

  return (
    <PublicPageShell>
      <InfoPageHero
        title="Notifications"
        description="Updates when LGU issues alerts or responds to your incident reports."
      />

      <PublicPageContent>
        <div className="flex items-center justify-end mb-6">
          <button
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
            <EmptyState icon={Bell} title="No notifications" description="You'll see updates here when LGU issues alerts or responds to your reports." />
          }
        >
          <div className={publicLayout.stackTight}>
            {notifications.map((n) => {
              const link = getRelatedLink(n);
              return (
                <Card key={n.id} className={`p-6 ${!n.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${n.priority === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {n.priority === 'CRITICAL' ? <AlertTriangle size={16} /> : <Bell size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-gray-900">{n.title}</h3>
                        <span className="text-[9px] font-black uppercase text-gray-400 shrink-0">{n.priority}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                      <div className="flex gap-3 mt-3">
                        {!n.is_read && (
                          <button onClick={() => markAsRead(n.id)} className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1">
                            <Check size={12} /> Mark read
                          </button>
                        )}
                        {link && (
                          <Link href={link} className="text-[10px] font-black text-gray-600 uppercase hover:text-blue-600">
                            View related record
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </AsyncState>
      </PublicPageContent>
    </PublicPageShell>
  );
}
