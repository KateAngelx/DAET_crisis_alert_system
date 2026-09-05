import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { getActiveSession } from '@/lib/authSession';
import { notifyGuideAssignment, notifyTouristGuideAssigned, notifyTouristAssignmentRequest, notifyGuideAssignmentAccepted, notifyGuideAssignmentDeclined } from '@/lib/notificationService';

async function respondToAssignmentViaApi(assignmentId, action) {
  const session = await getActiveSession();
  if (!session?.access_token) {
    return { success: false, error: 'Not authenticated.' };
  }

  const res = await fetch('/api/assignments/respond', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ assignmentId, action }),
  });

  const payload = await res.json();
  if (!res.ok) {
    return { success: false, error: payload.error || 'Request failed.' };
  }
  return payload;
}

export const useGuideStore = create((set, get) => ({
  guides: [],
  assignments: [],
  assignedTourists: [],
  tourGroups: [],
  activeGroup: null,
  groupMembers: [],
  searchResults: [],
  touristActiveGroup: null,
  pendingAssignment: null,
  availableTourists: [],
  guideIncidents: [],
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
          user_type: 'tourist',
        });
      }

      await get().fetchGuides();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  promoteToGuide: async () => ({
    success: false,
    error: 'Role changes must be performed by an administrator in User Management.',
  }),

  resetGuideScope: () => {
    set({
      tourGroups: [],
      activeGroup: null,
      groupMembers: [],
      assignedTourists: [],
      assignments: [],
      searchResults: [],
      guideIncidents: [],
      pendingAssignment: null,
      availableTourists: [],
      error: null,
    });
  },

  getGuideTouristIds: async (guideId) => {
    const { data } = await supabase
      .from('guide_assignments')
      .select('tourist_id')
      .eq('guide_id', guideId)
      .eq('status', 'active');
    return (data || []).map((a) => a.tourist_id);
  },

  fetchGuideIncidents: async (guideId) => {
    set({ loading: true, error: null });
    try {
      const touristIds = await get().getGuideTouristIds(guideId);
      let query = supabase
        .from('incident_reports')
        .select(`
          *,
          reporter:profiles!incident_reports_reporter_id_fkey(id, full_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (touristIds.length > 0) {
        query = query.or(
          `assigned_to.eq.${guideId},reporter_id.in.(${touristIds.join(',')})`
        );
      } else {
        query = query.eq('assigned_to', guideId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // #region agent log
      fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:fetchGuideIncidents',message:'Guide incidents fetched',data:{guideId,touristCount:touristIds.length,incidentCount:(data||[]).length,assignedToGuide:(data||[]).filter(i=>i.assigned_to===guideId).length},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      set({ guideIncidents: data || [], loading: false });
      return data || [];
    } catch (err) {
      set({ loading: false, error: err.message, guideIncidents: [] });
      return [];
    }
  },

  // ── Tour Groups ──────────────────────────────────────────────

  fetchTourGroups: async (guideId) => {
    if (!guideId) return [];
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('tour_groups')
      .select(`
        *,
        guide_assignments(id, status, tourist_id)
      `)
      .eq('guide_id', guideId)
      .order('created_at', { ascending: false });

    const groups = (data || []).map((g) => ({
      ...g,
      member_count: (g.guide_assignments || []).filter((a) => a.status === 'active').length,
    }));

    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:fetchTourGroups',message:'Tour groups fetched',data:{guideId,groupCount:groups.length,foreignGuideIds:groups.filter(g=>g.guide_id!==guideId).map(g=>g.guide_id)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    set({ tourGroups: groups, loading: false, error: error?.message });
    return groups;
  },

  fetchTourGroupById: async (groupId, guideId) => {
    if (!guideId) return null;
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('tour_groups')
      .select(`
        *,
        guide:profiles!tour_groups_guide_id_fkey(id, full_name, phone, email)
      `)
      .eq('id', groupId)
      .eq('guide_id', guideId)
      .maybeSingle();

    set({ activeGroup: data || null, loading: false, error: error?.message });

    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:fetchTourGroupById',message:'Tour group lookup',data:{groupId,guideId,found:!!data,groupGuideId:data?.guide_id||null,accessDenied:!data},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    return data;
  },

  createTourGroup: async ({
    guideId,
    name,
    starting_location,
    destination,
    trip_info,
    start_date,
    end_date,
    meeting_location,
    estimated_travel_time,
    destination_notes,
  }) => {
    try {
      const { data, error } = await supabase
        .from('tour_groups')
        .insert({
          guide_id: guideId,
          name,
          starting_location: starting_location || null,
          destination,
          trip_info: trip_info || null,
          start_date: start_date || null,
          end_date: end_date || null,
          meeting_location: meeting_location || null,
          estimated_travel_time: estimated_travel_time || null,
          destination_notes: destination_notes || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // #region agent log
      fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:createTourGroup',message:'Tour group route stored',data:{groupId:data.id,from:data.starting_location,to:data.destination,tourDate:data.start_date},timestamp:Date.now(),hypothesisId:'R2'})}).catch(()=>{});
      // #endregion

      await get().fetchTourGroups(guideId);
      return { success: true, group: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateTourGroupRoute: async (groupId, guideId, updates) => {
    try {
      const { data, error } = await supabase
        .from('tour_groups')
        .update({
          starting_location: updates.starting_location || null,
          destination: updates.destination,
          trip_info: updates.trip_info || null,
          start_date: updates.start_date || null,
          end_date: updates.end_date || null,
          meeting_location: updates.meeting_location || null,
          estimated_travel_time: updates.estimated_travel_time || null,
          destination_notes: updates.destination_notes || null,
        })
        .eq('id', groupId)
        .eq('guide_id', guideId)
        .select(`
          *,
          guide:profiles!tour_groups_guide_id_fkey(id, full_name, phone, email)
        `)
        .single();

      if (error) throw error;
      await get().fetchTourGroups(guideId);
      set({ activeGroup: data });
      return { success: true, group: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateTourGroupStatus: async (groupId, status, guideId) => {
    try {
      const { error } = await supabase
        .from('tour_groups')
        .update({ status })
        .eq('id', groupId)
        .eq('guide_id', guideId);

      if (error) throw error;

      if (status === 'completed' || status === 'cancelled') {
        await supabase
          .from('guide_assignments')
          .update({ status: 'removed', removed_at: new Date().toISOString() })
          .eq('tour_group_id', groupId)
          .in('status', ['active', 'pending']);
      }

      if (guideId) await get().fetchTourGroups(guideId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  fetchGroupMembers: async (tourGroupId, guideId) => {
    if (!guideId) return [];
    set({ loading: true, error: null });

    const group = await get().fetchTourGroupById(tourGroupId, guideId);
    if (!group) {
      set({ groupMembers: [], loading: false, error: 'Tour group not found.' });
      return [];
    }

    const { data, error } = await supabase
      .from('guide_assignments')
      .select(`
        *,
        tourist:profiles!guide_assignments_tourist_id_fkey(id, full_name, phone, email, nationality)
      `)
      .eq('tour_group_id', tourGroupId)
      .eq('guide_id', guideId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false });

    set({ groupMembers: data || [], loading: false, error: error?.message });
    return data;
  },

  searchTourists: async (query) => {
    let dbQuery = supabase
      .from('profiles')
      .select('id, full_name, phone, email, nationality')
      .eq('user_type', 'tourist')
      .order('full_name')
      .limit(25);

    if (query?.trim()) {
      const s = query.trim();
      dbQuery = dbQuery.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
    }

    const { data, error } = await dbQuery;
    const results = data || [];
    set({ searchResults: results, error: error?.message });
    return results;
  },

  fetchAvailableTourists: async (guideId, tourGroupId) => {
    set({ loading: true, error: null });
    try {
      const { data: registrations, error: regError } = await supabase
        .from('tourist_registrations')
        .select('user_id, registration_status, current_status')
        .in('registration_status', ['pending', 'approved', 'active'])
        .in('current_status', ['registered', 'on_tour', 'checked_in']);

      let userIds = (registrations || []).map((r) => r.user_id);
      let regMap = Object.fromEntries((registrations || []).map((r) => [r.user_id, r]));

      let profiles = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, phone, email, nationality')
          .in('id', userIds)
          .eq('user_type', 'tourist')
          .order('full_name');
        profiles = data || [];
      }

      // Fallback when no registration records exist (e.g. migration/RLS not applied yet)
      if (profiles.length === 0) {
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, phone, email, nationality')
          .eq('user_type', 'tourist')
          .order('full_name')
          .limit(50);
        profiles = fallbackProfiles || [];
        regMap = {};
      }

      const { data: assignments } = await supabase
        .from('guide_assignments')
        .select(`
          id, tourist_id, guide_id, tour_group_id, status,
          guide:profiles!guide_assignments_guide_id_fkey(id, full_name)
        `)
        .in('status', ['pending', 'active', 'declined']);

      const tourists = profiles.map((p) => ({
        ...p,
        registration_status: regMap[p.id]?.registration_status || 'approved',
        current_status: regMap[p.id]?.current_status || 'registered',
      }));

      // #region agent log
      fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:fetchAvailableTourists',message:'Tourists fetched',data:{guideId,tourGroupId,registrationCount:userIds.length,profileCount:profiles.length,touristCount:tourists.length,regError:regError?.message||null,usedFallback:userIds.length===0&&profiles.length>0},timestamp:Date.now(),hypothesisId:'AT2'})}).catch(()=>{});
      // #endregion

      set({ availableTourists: tourists, loading: false });
      return { tourists, assignments: assignments || [] };
    } catch (err) {
      set({ loading: false, error: err.message, availableTourists: [] });
      return { tourists: [], assignments: [] };
    }
  },

  sendAssignmentRequest: async ({ touristId, guideId, tourGroupId, assignedBy, notes }) => {
    try {
      const group = await get().fetchTourGroupById(tourGroupId, guideId);
      if (!group) {
        return { success: false, error: 'Tour group not found or access denied.' };
      }

      const { data: activeElsewhere } = await supabase
        .from('guide_assignments')
        .select('id, guide_id')
        .eq('tourist_id', touristId)
        .eq('status', 'active')
        .maybeSingle();

      if (activeElsewhere) {
        return { success: false, error: 'This tourist is already assigned to another guide.' };
      }

      const { data: existingPending } = await supabase
        .from('guide_assignments')
        .select('id')
        .eq('tourist_id', touristId)
        .eq('tour_group_id', tourGroupId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingPending) {
        return { success: false, error: 'An assignment request is already pending for this tourist.' };
      }

      const { data, error } = await supabase
        .from('guide_assignments')
        .insert({
          tourist_id: touristId,
          guide_id: guideId,
          tour_group_id: tourGroupId,
          assigned_by: assignedBy,
          notes,
          status: 'pending',
        })
        .select(`
          *,
          tourist:profiles!guide_assignments_tourist_id_fkey(*),
          guide:profiles!guide_assignments_guide_id_fkey(*),
          tour_group:tour_groups(id, name, destination, starting_location, start_date)
        `)
        .single();

      if (error) throw error;

      if (data.tourist && data.guide && data.tour_group) {
        await notifyTouristAssignmentRequest(data.tourist, data.guide, data.tour_group);
      }

      // #region agent log
      fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:sendAssignmentRequest',message:'Assignment request sent',data:{assignmentId:data.id,touristId,guideId,tourGroupId,status:'pending'},timestamp:Date.now(),hypothesisId:'A1'})}).catch(()=>{});
      // #endregion

      return { success: true, assignment: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  fetchPendingAssignmentForTourist: async (touristId) => {
    const { data, error } = await supabase
      .from('guide_assignments')
      .select(`
        *,
        guide:profiles!guide_assignments_guide_id_fkey(id, full_name, phone, email),
        tour_group:tour_groups(
          id, name, destination, starting_location, trip_info, status,
          start_date, end_date, meeting_location, estimated_travel_time, destination_notes
        )
      `)
      .eq('tourist_id', touristId)
      .eq('status', 'pending')
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let assignment = data;

    if (assignment && (!assignment.guide || !assignment.tour_group)) {
      if (assignment.guide_id && !assignment.guide) {
        const { data: guide } = await supabase
          .from('profiles')
          .select('id, full_name, phone, email')
          .eq('id', assignment.guide_id)
          .maybeSingle();
        assignment = { ...assignment, guide };
      }
      if (assignment.tour_group_id && !assignment.tour_group) {
        const { data: tour_group } = await supabase
          .from('tour_groups')
          .select(`
            id, name, destination, starting_location, trip_info, status,
            start_date, end_date, meeting_location, estimated_travel_time, destination_notes
          `)
          .eq('id', assignment.tour_group_id)
          .maybeSingle();
        assignment = { ...assignment, tour_group };
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:fetchPendingAssignmentForTourist',message:'Pending assignment loaded',data:{hasAssignment:!!assignment,guideName:assignment?.guide?.full_name||null,groupName:assignment?.tour_group?.name||null,error:error?.message||null},timestamp:Date.now(),hypothesisId:'M1'})}).catch(()=>{});
    // #endregion

    set({ pendingAssignment: assignment || null, error: error?.message });
    return assignment;
  },

  acceptAssignmentRequest: async (assignmentId, touristId) => {
    try {
      const apiResult = await respondToAssignmentViaApi(assignmentId, 'accept');
      if (!apiResult.success) {
        // #region agent log
        fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:acceptAssignmentRequest',message:'Accept API failed',data:{assignmentId,error:apiResult.error||null},timestamp:Date.now(),runId:'api-fix',hypothesisId:'A1'})}).catch(()=>{});
        // #endregion
        return { success: false, error: apiResult.error || 'Assignment request not found or already handled.' };
      }

      const data = apiResult.assignment;
      if (data?.guide && data?.tourist && data?.tour_group) {
        await notifyGuideAssignmentAccepted(data.guide, data.tourist, data.tour_group);
        await notifyGuideAssignment(data.guide, data.tourist, touristId);
        await notifyTouristGuideAssigned(data.tourist, data.guide);
      }

      set({ pendingAssignment: null, touristActiveGroup: data });

      // #region agent log
      fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:acceptAssignmentRequest',message:'Assignment accepted',data:{assignmentId,status:'active'},timestamp:Date.now(),runId:'api-fix',hypothesisId:'A2'})}).catch(()=>{});
      // #endregion

      await get().fetchTouristActiveGroup(touristId);
      return { success: true, assignment: data };
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:acceptAssignmentRequest',message:'Accept catch',data:{assignmentId,error:err.message},timestamp:Date.now(),runId:'api-fix',hypothesisId:'A1'})}).catch(()=>{});
      // #endregion
      return { success: false, error: err.message };
    }
  },

  declineAssignmentRequest: async (assignmentId, touristId) => {
    try {
      const apiResult = await respondToAssignmentViaApi(assignmentId, 'decline');
      if (!apiResult.success) {
        // #region agent log
        fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:declineAssignmentRequest',message:'Decline API failed',data:{assignmentId,error:apiResult.error||null},timestamp:Date.now(),runId:'api-fix',hypothesisId:'A1'})}).catch(()=>{});
        // #endregion
        return { success: false, error: apiResult.error || 'Could not decline request.' };
      }

      const assignment = apiResult.assignment;
      if (assignment?.guide && assignment?.tourist && assignment?.tour_group) {
        await notifyGuideAssignmentDeclined(assignment.guide, assignment.tourist, assignment.tour_group);
      }

      set({ pendingAssignment: null });
      return { success: true };
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'guideStore.js:declineAssignmentRequest',message:'Decline catch',data:{assignmentId,error:err.message},timestamp:Date.now(),runId:'api-fix',hypothesisId:'A1'})}).catch(()=>{});
      // #endregion
      return { success: false, error: err.message };
    }
  },

  fetchGroupPendingMembers: async (tourGroupId, guideId) => {
    const { data } = await supabase
      .from('guide_assignments')
      .select(`
        *,
        tourist:profiles!guide_assignments_tourist_id_fkey(id, full_name, phone, email, nationality)
      `)
      .eq('tour_group_id', tourGroupId)
      .eq('guide_id', guideId)
      .eq('status', 'pending')
      .order('assigned_at', { ascending: false });
    return data || [];
  },

  addTouristToGroup: async ({ touristId, guideId, tourGroupId, assignedBy, notes }) => {
    return get().sendAssignmentRequest({ touristId, guideId, tourGroupId, assignedBy, notes });
  },

  removeTouristFromGroup: async (assignmentId, tourGroupId, guideId) => {
    try {
      const { error } = await supabase
        .from('guide_assignments')
        .update({ status: 'removed', removed_at: new Date().toISOString() })
        .eq('id', assignmentId)
        .eq('guide_id', guideId);

      if (error) throw error;
      if (tourGroupId && guideId) await get().fetchGroupMembers(tourGroupId, guideId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  fetchTouristActiveGroup: async (touristId) => {
    const { data, error } = await supabase
      .from('guide_assignments')
      .select(`
        *,
        guide:profiles!guide_assignments_guide_id_fkey(id, full_name, phone, email),
        tour_group:tour_groups(
          id, name, destination, starting_location, trip_info, status,
          start_date, end_date, meeting_location, estimated_travel_time, destination_notes
        )
      `)
      .eq('tourist_id', touristId)
      .eq('status', 'active')
      .not('tour_group_id', 'is', null)
      .maybeSingle();

    const active = data?.tour_group?.status === 'active' ? data : null;
    set({ touristActiveGroup: active, error: error?.message });
    return active;
  },

  fetchAllAssignmentsAdmin: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('guide_assignments')
      .select(`
        *,
        tourist:profiles!guide_assignments_tourist_id_fkey(id, full_name, phone, nationality),
        guide:profiles!guide_assignments_guide_id_fkey(id, full_name, phone, email),
        tour_group:tour_groups(id, name, destination, starting_location, status, start_date)
      `)
      .order('assigned_at', { ascending: false });

    set({ assignments: data || [], loading: false, error: error?.message });
    return data || [];
  },

  fetchAllTourGroupsAdmin: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('tour_groups')
      .select(`
        *,
        guide:profiles!tour_groups_guide_id_fkey(id, full_name, phone, email),
        guide_assignments(
          id, status, assigned_at,
          tourist:profiles!guide_assignments_tourist_id_fkey(id, full_name, phone, nationality)
        )
      `)
      .order('created_at', { ascending: false });

    set({ tourGroups: data || [], loading: false, error: error?.message });
    return data;
  },

  // ── Legacy assignment helpers (kept for compatibility) ─────────

  fetchAssignments: async (guideId = null) => {
    set({ loading: true });
    let query = supabase
      .from('guide_assignments')
      .select(`
        *,
        tourist:profiles!guide_assignments_tourist_id_fkey(id, full_name, phone, email, nationality),
        guide:profiles!guide_assignments_guide_id_fkey(id, full_name, phone, email),
        tour_group:tour_groups(id, name, destination, status)
      `)
      .eq('status', 'active');

    if (guideId) query = query.eq('guide_id', guideId);

    const { data, error } = await query.order('assigned_at', { ascending: false });
    set({ assignments: data || [], loading: false, error: error?.message });
    return data;
  },

  assignTourist: async ({ touristId, guideId, tourGroupId, assignedBy, notes }) => {
    if (!tourGroupId) {
      return { success: false, error: 'A tour group is required for assignment.' };
    }
    return get().addTouristToGroup({ touristId, guideId, tourGroupId, assignedBy, notes });
  },

  removeAssignment: async (assignmentId, tourGroupId = null, guideId = null) => {
    return get().removeTouristFromGroup(assignmentId, tourGroupId, guideId);
  },

  fetchAssignedTourists: async (guideId) => {
    set({ loading: true });
    const assignments = await get().fetchAssignments(guideId);
    const withGroup = (assignments || []).filter((a) => a.tour_group_id);

    const tourists = withGroup.map((a) => ({
      ...a.tourist,
      assignment: a,
      tour_group: a.tour_group,
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
