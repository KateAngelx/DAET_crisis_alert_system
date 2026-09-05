import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  isSubscribed: false,

  fetchNotifications: async (userId) => {
    if (!userId) return;
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) {
      const unread = (data || []).filter((n) => !n.is_read).length;
      set({ notifications: data || [], unreadCount: unread, loading: false, error: null });
    } else {
      set({ loading: false, error: error.message });
    }

    if (get().isSubscribed) return;

    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          set((state) => ({
            notifications: [payload.new, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') set({ isSubscribed: true });
      });

    return () => {
      supabase.removeChannel(channel);
      set({ isSubscribed: false });
    };
  },

  markAsRead: async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    }
  },

  markAllAsRead: async (userId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error) {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    }
  },
}));
