import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { notifyGuideAssignment, notifyTouristGuideAssigned } from '@/lib/notificationService';

export const useGuideStore = create((set, get) => ({
  guides: [],
  assignments: [],
  assignedTourists: [],
  loading: false,
  error: null,

  fetchGuides: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_type', 'guide')
      .order('full_name');

    set({ guides: data || [], loading: false, error: error?.message });
    return data;
  },

  fetchAllUsers: async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    return data || [];
  },

  createGuide: async (guideData) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: guideData.email,
        password: guideData.password,
        options: {
          data: {
            full_name: guideData.full_name,
            phone: guideData.phone,
            user_type: 'guide',
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          full_name: guideData.full_name,
          phone: guideData.phone,
          email: guideData.email,
          user_type: 'guide',
        });
      }

      await get().fetchGuides();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  promoteToGuide: async (userId, adminId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: 'guide' })
        .eq('id', userId);

      if (error) throw error;
      await get().fetchGuides();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  fetchAssignments: async (guideId = null) => {
    set({ loading: true });
    let query = supabase
      .from('guide_assignments')
      .select(`
        *,
        tourist:profiles!guide_assignments_tourist_id_fkey(id, full_name, phone, email, nationality),
        guide:profiles!guide_assignments_guide_id_fkey(id, full_name, phone, email)
      `)
      .eq('status', 'active');

    if (guideId) query = query.eq('guide_id', guideId);

    const { data, error } = await query.order('assigned_at', { ascending: false });
    set({ assignments: data || [], loading: false, error: error?.message });
    return data;
  },

  assignTourist: async ({ touristId, guideId, assignedBy, notes }) => {
    try {
      await supabase
        .from('guide_assignments')
        .update({ status: 'removed', removed_at: new Date().toISOString() })
        .eq('tourist_id', touristId)
        .eq('status', 'active');

      const { data, error } = await supabase
        .from('guide_assignments')
        .insert({
          tourist_id: touristId,
          guide_id: guideId,
          assigned_by: assignedBy,
          notes,
          status: 'active',
        })
        .select(`
          *,
          tourist:profiles!guide_assignments_tourist_id_fkey(*),
          guide:profiles!guide_assignments_guide_id_fkey(*)
        `)
        .single();

      if (error) throw error;

      if (data.guide && data.tourist) {
        await notifyGuideAssignment(data.guide, data.tourist, assignedBy);
        await notifyTouristGuideAssigned(data.tourist, data.guide);
      }

      await get().fetchAssignments();
      return { success: true, assignment: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  removeAssignment: async (assignmentId) => {
    try {
      const { error } = await supabase
        .from('guide_assignments')
        .update({ status: 'removed', removed_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) throw error;
      await get().fetchAssignments();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  fetchAssignedTourists: async (guideId) => {
    set({ loading: true });
    const assignments = await get().fetchAssignments(guideId);

    const touristIds = (assignments || []).map((a) => a.tourist_id);

    if (touristIds.length === 0) {
      set({ assignedTourists: [], loading: false });
      return [];
    }

    const { data: registrations } = await supabase
      .from('tourist_registrations')
      .select('*')
      .in('user_id', touristIds);

    const tourists = (assignments || []).map((a) => ({
      ...a.tourist,
      assignment: a,
      registration: registrations?.find((r) => r.user_id === a.tourist_id) || null,
    }));

    set({ assignedTourists: tourists, loading: false });
    return tourists;
  },

  registerTourist: async (userId, registrationData) => {
    try {
      const { data, error } = await supabase
        .from('tourist_registrations')
        .upsert({
          user_id: userId,
          destination: registrationData.destination || 'Daet, Camarines Norte',
          tour_schedule: registrationData.tourSchedule || {},
          registration_status: 'pending',
          current_status: 'registered',
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, registration: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateTouristRegistration: async (userId, updates) => {
    try {
      const { data, error } = await supabase
        .from('tourist_registrations')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, registration: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
}));
