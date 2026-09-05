"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, X, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/app/store/crisisStore';
import { useNotificationStore } from '@/app/store/notificationStore';
import { NotificationPanelSkeleton } from '@/app/components/ui/Skeletons';
import { iconSize } from '@/lib/designSystem';

export function NotificationPanel({ linkPrefix = '' }) {
  const { user, isAuthenticated } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, loading, error } = useNotificationStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchNotifications(user.id);
    }
  }, [isAuthenticated, user?.id, fetchNotifications]);

  if (!isAuthenticated) return null;

  const getRelatedLink = (notification) => {
    if (notification.related_type === 'incident' && notification.related_id) {
      return `${linkPrefix}/crisis/reports/${notification.related_id}`;
    }
    return null;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
        aria-label={`${unreadCount} unread notifications`}
      >
        <Bell size={iconSize.nav} className="text-zinc-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead(user.id)}
                    className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <NotificationPanelSkeleton count={4} />
              ) : error ? (
                <div className="p-6 text-center">
                  <AlertTriangle size={24} className="mx-auto text-red-400 mb-2" />
                  <p className="text-xs font-bold text-red-600 uppercase mb-2">Failed to load</p>
                  <button
                    type="button"
                    onClick={() => fetchNotifications(user.id)}
                    className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold uppercase">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 20).map((n) => {
                  const relatedLink = getRelatedLink(n);
                  return (
                    <div
                      key={n.id}
                      className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg shrink-0 ${n.priority === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          {n.priority === 'CRITICAL' ? <AlertTriangle size={14} /> : <Bell size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-gray-900 truncate">{n.title}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[9px] text-gray-400 mt-1 font-bold uppercase">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {!n.is_read && (
                              <button
                                onClick={() => markAsRead(n.id)}
                                className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1"
                              >
                                <Check size={10} /> Mark read
                              </button>
                            )}
                            {relatedLink && (
                              <Link
                                href={relatedLink}
                                onClick={() => { markAsRead(n.id); setOpen(false); }}
                                className="text-[9px] font-black text-gray-600 uppercase hover:text-blue-600"
                              >
                                View details
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-gray-100 text-center">
              <Link
                href={`${linkPrefix}/notifications`}
                onClick={() => setOpen(false)}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
              >
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
