import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabaseClient';

export const useCrisisStore = create((set, get) => ({
  alerts: [], 
  allUsers: [], 
  totalUsers: 0, 
  loading: false,
  isSubscribed: false, // Flag para i-track ang realtime status

  fetchAlerts: async () => {
    // 1. Initial Data Fetch
    set({ loading: true });
    const { data, error } = await supabase
      .from('crisis_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) {
      set({ alerts: data, loading: false });
    } else {
      console.error("Fetch Error:", error.message);
      set({ loading: false });
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
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, 
      isAuthenticated: false,
      loading: false,

      login: async (email, password) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const userData = { 
            id: data.user.id, 
            name: profile?.full_name || 'User', 
            role: profile?.user_type || 'tourist' 
          };
          
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
          set({ loading: false });
          return { success: true };
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