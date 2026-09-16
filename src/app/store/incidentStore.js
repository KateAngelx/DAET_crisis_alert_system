import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import {
  dispatchNotification,
  notifyAdminsOfIncident,
  notifyUserOfStatusChange,
} from '@/lib/notificationService';
import { severityToPriority } from '@/lib/constants';
import { INCIDENT_QUEUE_EXCLUDED_STATUSES } from '@/lib/incidentAuditUtils';

export const useIncidentStore = create((set, get) => ({
  incidents: [],
  currentIncident: null,
  history: [],
  auditLog: [],
  auditLogLoading: false,
  loading: false,
  error: null,
  filters: { status: 'All', category: 'All', severity: 'All', search: '' },

  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

  fetchIncidents: async (options = {}) => {
    set({ loading: true, error: null });
    try {
      let query = supabase
        .from('incident_reports')
        .select(`
          *,
          reporter:profiles!incident_reports_reporter_id_fkey(id, full_name, phone, email, nationality),
          assignee:profiles!incident_reports_assigned_to_fkey(id, full_name, phone),
          attachments:incident_attachments(*)
        `)
        .order('created_at', { ascending: false });

      if (options.reporterId) query = query.eq('reporter_id', options.reporterId);
      if (options.assignedTo) query = query.eq('assigned_to', options.assignedTo);
      if (options.reporterIds?.length) query = query.in('reporter_id', options.reporterIds);
      if (options.status) query = query.eq('status', options.status);
      if (options.severity) query = query.eq('severity', options.severity);

      const { data, error } = await query;
      if (error) throw error;
      set({ incidents: data || [], loading: false });
      return data;
    } catch (err) {
      set({ loading: false, error: err.message });
      return [];
    }
  },

  fetchIncidentById: async (id) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('incident_reports')
        .select(`
          *,
          reporter:profiles!incident_reports_reporter_id_fkey(id, full_name, phone, email, nationality),
          assignee:profiles!incident_reports_assigned_to_fkey(id, full_name, phone),
          attachments:incident_attachments(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const { data: history } = await supabase
        .from('incident_history')
        .select('*, changer:profiles!incident_history_changed_by_fkey(full_name)')
        .eq('incident_id', id)
        .order('created_at', { ascending: false });

      set({ currentIncident: data, history: history || [], loading: false });
      return data;
    } catch (err) {
      set({ loading: false, error: err.message });
      return null;
    }
  },

  submitReport: async (reportData, files = []) => {
    set({ loading: true, error: null });
    try {
      const refResponse = await supabase.rpc('generate_incident_reference');
      const referenceNumber = refResponse.data || `INC-${Date.now()}`;

      const { data: incident, error } = await supabase
        .from('incident_reports')
        .insert({
          reference_number: referenceNumber,
          reporter_id: reportData.reporterId,
          category: reportData.category,
          description: reportData.description,
          location: reportData.location,
          latitude: reportData.latitude,
          longitude: reportData.longitude,
          severity: reportData.severity,
          status: 'Submitted',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('incident_history').insert({
        incident_id: incident.id,
        changed_by: reportData.reporterId,
        action: 'created',
        new_status: 'Submitted',
        notes: 'Report submitted by user',
      });

      if (files.length > 0) {
        for (const file of files) {
          const filePath = `${reportData.reporterId}/${incident.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('incident-attachments')
            .upload(filePath, file);

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('incident-attachments').getPublicUrl(filePath);
            await supabase.from('incident_attachments').insert({
              incident_id: incident.id,
              file_url: urlData.publicUrl,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
            });
          }
        }
      }

      const { data: admins } = await supabase.from('profiles').select('*').eq('user_type', 'admin');
      if (admins?.length) {
        await notifyAdminsOfIncident({ ...incident, reference_number: referenceNumber }, admins);
      }

      await dispatchNotification({
        userId: reportData.reporterId,
        title: 'Incident Report Submitted',
        message: `Your report ${referenceNumber} has been submitted successfully. We will review it shortly.`,
        notificationType: 'incident_submitted',
        priority: severityToPriority(reportData.severity),
        relatedType: 'incident',
        relatedId: incident.id,
        channels: ['web'],
      });

      set({ loading: false });
      return { success: true, incident: { ...incident, reference_number: referenceNumber } };
    } catch (err) {
      set({ loading: false, error: err.message });
      return { success: false, error: 'We could not process your request right now. Please try again.' };
    }
  },

  updateIncidentStatus: async (id, status, adminData = {}) => {
    try {
      const { data: incident, error } = await supabase
        .from('incident_reports')
        .update({
          status,
          assigned_to: adminData.assignedTo || undefined,
          admin_notes: adminData.adminNotes || undefined,
          response_actions: adminData.responseActions || undefined,
        })
        .eq('id', id)
        .select('*, reporter:profiles!incident_reports_reporter_id_fkey(*)')
        .single();

      if (error) throw error;

      if (adminData.changedBy) {
        await supabase.from('incident_history').insert({
          incident_id: id,
          changed_by: adminData.changedBy,
          action: adminData.action || 'status_update',
          old_status: adminData.oldStatus,
          new_status: status,
          notes: adminData.notes || adminData.adminNotes,
        });
      }

      if (incident.reporter) {
        await notifyUserOfStatusChange(incident, incident.reporter);
      }

      if (adminData.assignedTo && adminData.assigneeProfile) {
        await dispatchNotification({
          userId: adminData.assignedTo,
          title: `Incident Assigned: ${incident.reference_number}`,
          message: `You have been assigned to respond to a ${incident.severity} ${incident.category} incident at ${incident.location}.`,
          notificationType: 'incident_assigned',
          priority: severityToPriority(incident.severity),
          relatedType: 'incident',
          relatedId: id,
          channels: ['web', 'email', 'sms'],
          recipientEmail: adminData.assigneeProfile.email,
          recipientPhone: adminData.assigneeProfile.phone,
        });
      }

      await get().fetchIncidents();
      return { success: true, incident };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  fetchIncidentAuditLog: async (limit = 40) => {
    set({ auditLogLoading: true });
    try {
      const { data, error } = await supabase
        .from('incident_history')
        .select(`
          id,
          action,
          old_status,
          new_status,
          notes,
          created_at,
          changer:profiles!incident_history_changed_by_fkey(full_name),
          incident_reports(reference_number, category)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      set({ auditLog: data || [], auditLogLoading: false });
      return data;
    } catch (err) {
      set({ auditLogLoading: false, error: err.message });
      return [];
    }
  },

  getFilteredIncidents: () => {
    const { incidents, filters } = get();
    return incidents.filter((inc) => {
      if (filters.status === 'All' && INCIDENT_QUEUE_EXCLUDED_STATUSES.includes(inc.status)) {
        return false;
      }
      if (filters.status !== 'All' && inc.status !== filters.status) return false;
      if (filters.category !== 'All' && inc.category !== filters.category) return false;
      if (filters.severity !== 'All' && inc.severity !== filters.severity) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        return (
          inc.reference_number?.toLowerCase().includes(s) ||
          inc.location?.toLowerCase().includes(s) ||
          inc.description?.toLowerCase().includes(s) ||
          inc.reporter?.full_name?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  },

  getDashboardStats: () => {
    const { incidents } = get();
    const active = incidents.filter((i) => !['Resolved', 'Closed', 'Rejected'].includes(i.status));
    return {
      total: incidents.length,
      active: active.length,
      critical: incidents.filter((i) => i.severity === 'Critical' && !['Resolved', 'Closed'].includes(i.status)).length,
      high: incidents.filter((i) => i.severity === 'High' && !['Resolved', 'Closed'].includes(i.status)).length,
      pending: incidents.filter((i) => ['Submitted', 'Received', 'Under Review'].includes(i.status)).length,
      approved: incidents.filter((i) => ['Approved', 'Received'].includes(i.status)).length,
      responding: incidents.filter((i) => ['Assigned', 'Responding'].includes(i.status)).length,
      resolved: incidents.filter((i) => ['Resolved', 'Closed', 'Rejected'].includes(i.status)).length,
      byCategory: INCIDENT_CATEGORIES.reduce((acc, cat) => {
        acc[cat] = incidents.filter((i) => i.category === cat).length;
        return acc;
      }, {}),
    };
  },
}));

const INCIDENT_CATEGORIES = [
  'Accident', 'Medical Emergency', 'Natural Disaster', 'Missing Person',
  'Fire', 'Crime/Security Concern', 'Road/Transportation Problem',
  'Tourist Assistance', 'Weather-Related Incident', 'Other',
];
