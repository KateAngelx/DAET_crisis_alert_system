import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabaseClient';

export const useCrisisStore = create((set, get) => ({
  alerts: [], 
  allUsers: [], 
  totalUsers: 0, 
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
        set({ alerts: data, loading: false, error: null });
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
              
              return { alerts: [payload.new, ...state.alerts] };
            });
          } else if (payload.eventType === 'UPDATE') {
            set((state) => ({
              alerts: state.alerts.map((a) => (a.id === payload.new.id ? payload.new : a)),
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

  fetchAllUsers: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();

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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_type }),
      });

      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to update role' };
      }

      set((state) => ({
        allUsers: state.allUsers.map((u) =>
          u.id === userId ? { ...u, user_type: result.profile.user_type } : u
        ),
      }));

      return { success: true, profile: result.profile };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  addAlert: async (alertData) => {
    try {
      const { data, error } = await supabase
        .from('crisis_alerts')
        .insert([
          {
            title: alertData.title,
            message: alertData.message,
            type: alertData.type || 'General',
            severity: alertData.severity || 'Low',
            location: alertData.location,
            status: 'Active',
            is_public: true,
            channels: alertData.channels || { email: true, sms: true, app: true }
          }
        ])
        .select();

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Supabase Add Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  updateAlert: async (id, updatedData) => {
    try {
      const { error } = await supabase
        .from('crisis_alerts')
        .update({
          title: updatedData.title,
          message: updatedData.message,
          type: updatedData.type,
          severity: updatedData.severity,
          location: updatedData.location,
          channels: updatedData.channels,
          is_public: true
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Supabase Update Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  updateAlertStatus: async (id, status) => {
    try {
      const { error } = await supabase.from('crisis_alerts').update({ status }).eq('id', id);
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
  return {
    id: profile.id,
    name: profile.full_name || "User",
    role: profile.user_type || "tourist",
    email: profile.email || "",
    phone: profile.phone || "",
    nationality: profile.nationality || "Filipino",
    created_at: profile.created_at || null,
  };
}

async function syncProfileFromServer(session) {
  const res = await fetch('/api/auth/ensure-profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
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
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            set({ loading: false });
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
          const { data: { session } } = await supabase.auth.getSession();
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

      login: async (email, password) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;

          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No active session after login. Check if email confirmation is required in Supabase.');

          const profile = await syncProfileFromServer(session);

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

          const { data: { session } } = await supabase.auth.getSession();
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

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
        window.location.href = '/';
      },
    }),
    { name: 'connect-daet-auth' }
  )
);