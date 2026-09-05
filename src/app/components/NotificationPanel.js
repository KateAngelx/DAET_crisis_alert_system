"use client";



import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import { Bell, X, AlertTriangle } from 'lucide-react';

import { useAuthStore } from '@/app/store/crisisStore';

import { useNotificationStore } from '@/app/store/notificationStore';

import { NotificationPanelSkeleton } from '@/app/components/ui/Skeletons';

import { NotificationItemCard } from '@/app/components/NotificationItemCard';

import { getActiveSession } from '@/lib/authSession';
import { getAreaHazardNotificationLink } from '@/lib/travelLinks';
import { iconSize } from '@/lib/designSystem';



export function NotificationPanel({ linkPrefix = '' }) {

  const { user, isAuthenticated } = useAuthStore();

  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, loading, error, clearNotifications } = useNotificationStore();

  const [open, setOpen] = useState(false);

  const [sessionReady, setSessionReady] = useState(false);



  useEffect(() => {

    let cancelled = false;



    async function loadForSession() {

      const session = await getActiveSession();

      if (cancelled) return;



      if (!session?.user?.id) {

        clearNotifications();

        setSessionReady(false);

        return;

      }



      setSessionReady(true);

      await fetchNotifications(session.user.id);

    }



    if (isAuthenticated && user?.id) {

      loadForSession();

    } else {

      clearNotifications();

      setSessionReady(false);

    }



    return () => {

      cancelled = true;

    };

  }, [isAuthenticated, user?.id, fetchNotifications, clearNotifications]);



  if (!isAuthenticated || !sessionReady || !user?.id) return null;



  const getRelatedLink = (notification) => {

    if (notification.related_type === 'incident' && notification.related_id) {

      return `${linkPrefix}/crisis/reports/${notification.related_id}`;

    }

    if (notification.related_type === 'alert') {

      return `${linkPrefix}/crisis`;

    }

    if (notification.related_type === 'dangerous_location') {
      return getAreaHazardNotificationLink(notification, { prefix: linkPrefix });
    }

    return null;

  };



  return (

    <div className="relative">

      <button

        type="button"

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

                    type="button"

                    onClick={() => markAllAsRead(user.id)}

                    className="text-[10px] font-bold text-blue-600 uppercase hover:underline"

                  >

                    Mark all read

                  </button>

                )}

                <button type="button" onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">

                  <X size={16} />

                </button>

              </div>

            </div>



            <div className="max-h-80 overflow-y-auto p-3 space-y-3">

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

                notifications.slice(0, 20).map((n) => (

                  <NotificationItemCard

                    key={n.id}

                    notification={n}

                    compact

                    relatedLink={getRelatedLink(n)}

                    onMarkRead={markAsRead}

                    onNavigate={() => setOpen(false)}

                  />

                ))

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


