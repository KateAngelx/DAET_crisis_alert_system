import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import { getActiveSession } from "@/lib/authSession";

let activeChannel = null;
let activeChannelUserId = null;
let channelInstance = 0;
let subscriptionSetup = Promise.resolve();

function removeActiveChannel() {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
  activeChannelUserId = null;
}

function countUnread(notifications) {
  // Dismissed ("not affected") notices never count as unread.
  return (notifications || []).filter((notification) => !notification.is_read && !notification.dismissed_at).length;
}

function applyIncomingNotification(state, incoming) {
  if (!incoming?.id || state.notifications.some((notification) => notification.id === incoming.id)) {
    return state;
  }

  return {
    notifications: [incoming, ...state.notifications],
    unreadCount: incoming.is_read ? state.unreadCount : state.unreadCount + 1,
    latestArrival: incoming,
  };
}

function listenForNotifications(set, get, userId) {
  subscriptionSetup = subscriptionSetup.catch(() => {}).then(() => {
    if (activeChannelUserId === userId && activeChannel) return;
    removeActiveChannel();
    set({ isSubscribed: false });

    try {
      const channel = supabase.channel(`notifications_${userId}_${++channelInstance}`);
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (get().sessionUserId !== userId) return;
          set((state) => applyIncomingNotification(state, payload.new));
        }
      );
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (get().sessionUserId !== userId) return;
          set((state) => {
            const notifications = state.notifications.map((notification) =>
              notification.id === payload.new.id ? payload.new : notification
            );
            return { notifications, unreadCount: countUnread(notifications) };
          });
        }
      );
      activeChannel = channel;
      activeChannelUserId = userId;
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED" && activeChannel === channel) set({ isSubscribed: true });
      });
    } catch {
      removeActiveChannel();
      set({ isSubscribed: false });
    }
  });
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
      set({ loading: false, error: "Session mismatch", notifications: [], unreadCount: 0 });
      return;
    }

    set({ loading: true, error: null, sessionUserId });

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", sessionUserId)
      .order("created_at", { ascending: false })
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

    if (get().sessionUserId !== sessionUserId) return;
    if (activeChannelUserId === sessionUserId && activeChannel) return;
    listenForNotifications(set, get, sessionUserId);
  },

  markAsRead: async (notificationId) => {
    const session = await getActiveSession();
    const sessionUserId = session?.user?.id;
    if (!sessionUserId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", sessionUserId);

    if (!error) {
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    }
  },

  /** Hide (or show again) an alert notice the person says does not affect them. */
  dismissNotification: async (notificationId, dismissed = true) => {
    const session = await getActiveSession();
    const sessionUserId = session?.user?.id;
    if (!sessionUserId) return { success: false, error: "Sign in again to manage notifications." };

    const changes = dismissed
      ? { dismissed_at: new Date().toISOString(), is_read: true }
      : { dismissed_at: null };
    const { error } = await supabase
      .from("notifications")
      .update(changes)
      .eq("id", notificationId)
      .eq("user_id", sessionUserId);

    if (error) {
      const notSetUp = error.code === "PGRST204" || error.code === "42703";
      return {
        success: false,
        error: notSetUp
          ? "Dismissing is not set up yet."
          : /cannot be dismissed/i.test(error.message)
            ? "Critical alerts cannot be dismissed."
            : "Could not update this notification.",
      };
    }

    set((state) => {
      const notifications = state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, ...changes } : notification
      );
      return { notifications, unreadCount: countUnread(notifications) };
    });
    return { success: true };
  },

  markAllAsRead: async (userId) => {
    const session = await getActiveSession();
    const sessionUserId = session?.user?.id;
    if (!sessionUserId || sessionUserId !== userId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", sessionUserId)
      .eq("is_read", false);

    if (!error) {
      set((state) => ({
        notifications: state.notifications.map((notification) => ({ ...notification, is_read: true })),
        unreadCount: 0,
      }));
    }
  },
}));
