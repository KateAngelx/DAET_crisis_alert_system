import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabaseClient';
import { useNotificationStore } from '@/app/store/notificationStore';
import { channelsToDb, normalizeAlert } from '@/lib/alertChannels';
import { getActiveSession } from '@/lib/authSession';
import { DEFAULT_USER_NOTIFICATION_CHANNELS } from '@/lib/userNotificationChannels';

export const useCrisisStore = create((set, get) => ({
  alerts: [], 
  allUsers: [], 
  totalUsers: 0,
  userStats: null,
  loading: false,
  error: null,
  isSubscribed: false, // Flag para i-track ang realtime status

  fetchAlerts: async () => {
    // 1. Initial Data Fetch
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('crisis_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) {
        const normalizedAlerts = (data || []).map(normalizeAlert);
        set({ alerts: normalizedAlerts, loading: false, error: null });
      } else {
        console.error("Fetch Error:", error.message);
        set({ loading: false, error: error.message });
      }
    } catch (err) {
      const message = err?.message || 'Could not load alerts.';
      console.error("Fetch Error:", message);
      set({ loading: false, error: message });
      return;
    }

    // 2. REALTIME GUARD: Check and lock state synchronously to prevent race conditions
    if (get().isSubscribed) return;
    set({ isSubscribed: true }); // Lock immediately!

    // 3. DESTROY ZOMBIES: Forcefully clean up any lingering channels with the same name
    const existingChannels = supabase.getChannels();
    existingChannels.forEach((ch) => {
      if (ch.topic === 'realtime:crisis_realtime_sync') {
        supabase.removeChannel(ch);
      }
    });

    // 4. Create a fresh, safe subscription
    supabase
      .channel('crisis_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', table: 'crisis_alerts', schema: 'public' },
        (payload) => {
          console.log('Realtime change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            set((state) => {
              // Prevent duplicates: Check if the alert already exists in the state
              const alreadyExists = state.alerts.some((a) => a.id === payload.new.id);
              if (alreadyExists) return state; // Do nothing if it's already there
              
              return { alerts: [normalizeAlert(payload.new), ...state.alerts] };
            });
          } else if (payload.eventType === 'UPDATE') {
            set((state) => ({
              alerts: state.alerts.map((a) => (a.id === payload.new.id ? normalizeAlert(payload.new) : a)),
            }));
          } else if (payload.eventType === 'DELETE') {
            set((state) => ({
              alerts: state.alerts.filter((a) => a.id !== payload.old.id),
            }));
          }
        }
      )
      .subscribe();
  },

  fetchTotalUsers: async () => {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (!error) {
      set({ totalUsers: count || 0 });
    } else {
      console.error("User Count Error:", error.message);
    }
  },

  fetchUserStats: async () => {
    try {
      const session = await getActiveSession();
      if (!session) return { success: false, error: 'Not authenticated' };

      const res = await fetch('/api/admin/user-stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to load user stats' };
      }

      set({ userStats: result.stats });
      return { success: true, stats: result.stats };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  fetchAllUsers: async () => {
    set({ loading: true });
    try {
      const session = await getActiveSession();

      if (session) {
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const { users } = await res.json();
          set({ allUsers: users, loading: false });
          return;
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      
      if (!error) {
        set({ allUsers: data, loading: false });
      } else {
        console.error("Fetch Users Error:", error.message);
        set({ loading: false });
      }
    } catch (err) {
      console.error("Fetch Users Error:", err.message);
      set({ loading: false });
    }
  },

  updateUserRole: async (userId, user_type) => {
    return get().updateUser(userId, { user_type });
  },

  updateUser: async (userId, payload) => {
    try {
      const session = await getActiveSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to update user' };
      }

      set((state) => ({
        allUsers: state.allUsers.map((u) =>
          u.id === userId ? { ...u, ...result.profile } : u
        ),
      }));

      return { success: true, profile: result.profile };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  createUser: async (payload) => {
    try {
      const session = await getActiveSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to create user' };
      }

      set((state) => ({
        allUsers: [...state.allUsers, result.profile].sort((a, b) =>
          (a.full_name || '').localeCompare(b.full_name || '')
        ),
      }));

      return { success: true, profile: result.profile };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  deleteUser: async (userId) => {
    try {
      const session = await getActiveSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to delete user' };
      }

      set((state) => ({
        allUsers: state.allUsers.filter((u) => u.id !== userId),
      }));

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  addAlert: async (alertData) => {
    try {
      const insertPayload = {
        title: alertData.title,
        message: alertData.message,
        type: alertData.type || 'General',
        severity: alertData.severity || 'Low',
        location: alertData.location,
        status: 'Active',
        is_public: true,
        channels: channelsToDb(alertData.channels || { email: true, sms: true, app: true })
      };

      if (alertData.latitude != null && alertData.longitude != null) {
        insertPayload.latitude = Number(alertData.latitude);
        insertPayload.longitude = Number(alertData.longitude);
      }

      let { data, error } = await supabase
        .from('crisis_alerts')
        .insert([insertPayload])
        .select();

      if (error && insertPayload.latitude != null) {
        const { latitude, longitude, ...fallbackPayload } = insertPayload;
        ({ data, error } = await supabase
          .from('crisis_alerts')
          .insert([fallbackPayload])
          .select());
      }

      if (error) throw error;
      return { success: true, alert: normalizeAlert(data?.[0]) };
    } catch (error) {
      console.error("Supabase Add Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  updateAlert: async (id, updatedData) => {
    try {
      const updatePayload = {
        title: updatedData.title,
        message: updatedData.message,
        type: updatedData.type,
        severity: updatedData.severity,
        location: updatedData.location,
        channels: channelsToDb(updatedData.channels),
        is_public: true
      };

      if (updatedData.latitude != null && updatedData.longitude != null) {
        updatePayload.latitude = Number(updatedData.latitude);
        updatePayload.longitude = Number(updatedData.longitude);
      }

      let { error } = await supabase
        .from('crisis_alerts')
        .update(updatePayload)
        .eq('id', id);

      if (error && updatePayload.latitude != null) {
        const { latitude, longitude, ...fallbackPayload } = updatePayload;
        ({ error } = await supabase
          .from('crisis_alerts')
          .update(fallbackPayload)
          .eq('id', id));
      }

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Supabase Update Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  updateAlertStatus: async (id, status) => {
    try {
      const updatePayload = { status };
      if (status === 'Resolved') {
        updatePayload.resolved_at = new Date().toISOString();
      } else if (status === 'Active') {
        updatePayload.resolved_at = null;
      }

      const { error } = await supabase.from('crisis_alerts').update(updatePayload).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Status Update Error:", err.message);
      return { success: false, error: err.message };
    }
  },

  deleteAlert: async (id) => {
    await supabase.from('crisis_alerts').delete().eq('id', id);
  }
}));

// Auth Store Section

function mapProfileToUser(profile) {
  if (!profile) return null;
  const channels = profile.notification_channels || DEFAULT_USER_NOTIFICATION_CHANNELS;
  return {
    id: profile.id,
    name: profile.full_name || "User",
    role: profile.user_type || "tourist",
    email: profile.email || "",
    phone: profile.phone || "",
    nationality: profile.nationality || "Filipino",
    created_at: profile.created_at || null,
    notification_channels: {
      email: Boolean(channels.email),
      sms: Boolean(channels.sms),
      app: Boolean(channels.app ?? channels.web ?? true),
    },
    notification_channels_configured: Boolean(profile.notification_channels_configured),
  };
}

async function syncProfileFromServer(session, { loginEvent = false } = {}) {
  const res = await fetch('/api/auth/ensure-profile', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ loginEvent }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to sync profile');
  return result.profile;
}

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, 
      isAuthenticated: false,
      loading: false,

      fetchProfile: async () => {
        set({ loading: true });
        try {
          const session = await getActiveSession();
          if (!session) {
            set({ user: null, isAuthenticated: false, loading: false });
            return { success: false, error: "Not authenticated" };
          }

          let profile;
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (error || !data) {
            profile = await syncProfileFromServer(session);
          } else {
            profile = data;
          }

          const userData = mapProfileToUser(profile);
          set({ user: userData, isAuthenticated: true, loading: false });
          return { success: true, profile };
        } catch (err) {
          set({ loading: false });
          return { success: false, error: err.message };
        }
      },

      updateProfile: async ({ full_name, phone, nationality }) => {
        set({ loading: true });
        try {
          const session = await getActiveSession();
          if (!session) throw new Error("Not authenticated");

          const { data, error } = await supabase
            .from("profiles")
            .update({ full_name, phone, nationality })
            .eq("id", session.user.id)
            .select()
            .single();

          if (error) throw error;

          await supabase.auth.updateUser({
            data: { full_name, phone, nationality },
          });

          const userData = mapProfileToUser(data);
          set({ user: userData, isAuthenticated: true, loading: false });
          return { success: true, profile: data };
        } catch (err) {
          set({ loading: false });
          return { success: false, error: err.message };
        }
      },

      updateNotificationChannels: async (channels, markConfigured = true) => {
        set({ loading: true });
        try {
          const session = await getActiveSession();
          if (!session) throw new Error("Not authenticated");

          const res = await fetch("/api/auth/notification-channels", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ channels, skip: false }),
          });
          const result = await res.json();

          if (!res.ok) {
            throw new Error(result.error || "Failed to save preferences");
          }

          const userData = mapProfileToUser(result.profile);
          set({ user: userData, isAuthenticated: true, loading: false });
          return { success: true, profile: result.profile };
        } catch (err) {
          set({ loading: false });
          return { success: false, error: err.message };
        }
      },

      skipNotificationChannelSetup: async () => {
        set({ loading: true });
        try {
          const session = await getActiveSession();
          if (!session) throw new Error("Not authenticated");

          const res = await fetch("/api/auth/notification-channels", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ skip: true }),
          });
          const result = await res.json();

          if (!res.ok) {
            throw new Error(result.error || "Failed to skip setup");
          }

          const userData = mapProfileToUser(result.profile);
          set({ user: userData, isAuthenticated: true, loading: false });
          return { success: true, profile: result.profile };
        } catch (err) {
          set({ loading: false });
          return { success: false, error: err.message };
        }
      },

      login: async (email, password) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;

          const session = await getActiveSession();
          if (!session) throw new Error('No active session after login. Check if email confirmation is required in Supabase.');

          const profile = await syncProfileFromServer(session, { loginEvent: true });

          const userData = mapProfileToUser(profile);
          
          set({ user: userData, isAuthenticated: true, loading: false });
          return { success: true, role: userData.role };
        } catch (err) {
          set({ loading: false });
          return { success: false, error: err.message };
        }
      },

      register: async (name, email, password, phone, nationality) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: { 
              data: { 
                full_name: name,
                phone: phone,
                nationality: nationality 
              } 
            }
          });
          if (error) throw error;

          const session = await getActiveSession();
          if (session) {
            await syncProfileFromServer(session);
          }

          set({ loading: false });
          return {
            success: true,
            needsConfirmation: !session,
            message: !session
              ? 'Account created. Please confirm your email, then sign in.'
              : 'Account created successfully.',
          };
        } catch (err) {
          set({ loading: false });
          return { success: false, error: err.message };
        }
      },

      requestPasswordReset: async (email) => {
        set({ loading: true });
        try {
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Could not send reset email.');
          }
          set({ loading: false });
          return { success: true, message: data.message };
        } catch (err) {
          set({ loading: false });
          return { success: false, error: err.message };
        }
      },

      updatePassword: async (password) => {
        set({ loading: true });
        try {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
          set({ loading: false });
          return { success: true };
        } catch (err) {
          set({ loading: false });
          return { success: false, error: err.message };
        }
      },

      logout: async () => {
        useNotificationStore.getState().clearNotifications();
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
        window.location.href = '/';
      },

      deleteAccount: async () => {
        set({ loading: true });
        try {
          const session = await getActiveSession();
          if (!session) throw new Error('Not authenticated');

          const res = await fetch('/api/auth/delete-account', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const result = await res.json();
          if (!res.ok) {
            throw new Error(result.error || 'Failed to delete account');
          }

          useNotificationStore.getState().clearNotifications();
          await supabase.auth.signOut();
          set({ user: null, isAuthenticated: false, loading: false });
          window.location.href = '/';
          return { success: true };
        } catch (err) {
          set({ loading: false });
          return { success: false, error: err.message };
        }
      },
    }),
    { name: 'connect-daet-auth' }
  )
);