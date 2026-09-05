import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { getActiveSession } from '@/lib/authSession';

let activeChannel = null;

function removeActiveChannel() {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
}

function countUnread(notifications) {
  return (notifications || []).filter((notification) => !notification.is_read).length;
}

function applyIncomingNotification(state, incoming) {
  if (state.notifications.some((notification) => notification.id === incoming.id)) {
    return state;
  }

  return {
    notifications: [incoming, ...state.notifications],
    unreadCount: incoming.is_read ? state.unreadCount : state.unreadCount + 1,
    latestArrival: incoming,
  };
}

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  isSubscribed: false,
  sessionUserId: null,
  latestArrival: null,

  clearNotifications: () => {
    removeActiveChannel();
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      isSubscribed: false,
      sessionUserId: null,
      latestArrival: null,
    });
  },

  dismissLatestArrival: () => set({ latestArrival: null }),

  fetchNotifications: async (userId) => {
    const session = await getActiveSession();
    const sessionUserId = session?.user?.id;

    if (!sessionUserId) {
      get().clearNotifications();
      return;
    }

    if (userId && userId !== sessionUserId) {
      set({ loading: false, error: 'Session mismatch', notifications: [], unreadCount: 0 });
      return;
    }

    const authenticatedUserId = sessionUserId;
    set({ loading: true, error: null, sessionUserId: authenticatedUserId });

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', authenticatedUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) {
      set({
        notifications: data || [],
        unreadCount: countUnread(data),
        loading: false,
        error: null,
      });
    } else {
      set({ loading: false, error: error.message });
    }

    if (get().isSubscribed && get().sessionUserId === authenticatedUserId) return;

    removeActiveChannel();
    set({ isSubscribed: false });

    activeChannel = supabase
      .channel(`notifications_${authenticatedUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${authenticatedUserId}`,
        },
        (payload) => {
          if (get().sessionUserId !== authenticatedUserId) return;
          set((state) => applyIncomingNotification(state, payload.new));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${authenticatedUserId}`,
        },
        (payload) => {
          if (get().sessionUserId !== authenticatedUserId) return;
          set((state) => {
            const notifications = state.notifications.map((notification) =>
              notification.id === payload.new.id ? payload.new : notification
            );
            return {
              notifications,
              unreadCount: countUnread(notifications),
            };
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') set({ isSubscribed: true });
      });

    return () => {
      removeActiveChannel();
      set({ isSubscribed: false });
    };
  },

  markAsRead: async (notificationId) => {
    const session = await getActiveSession();
    const sessionUserId = session?.user?.id;
    if (!sessionUserId) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', sessionUserId);

    if (!error) {
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    }
  },

  markAllAsRead: async (userId) => {
    const session = await getActiveSession();
    const sessionUserId = session?.user?.id;
    if (!sessionUserId || sessionUserId !== userId) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', sessionUserId)
      .eq('is_read', false);

    if (!error) {
      set((state) => ({
        notifications: state.notifications.map((notification) => ({ ...notification, is_read: true })),
        unreadCount: 0,
      }));
    }
  },
}));
