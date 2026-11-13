import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import {
  dispatchNotification,
  notifyUserOfStatusChange,
} from '@/lib/notificationService';
import { fetchWithFreshSession } from '@/lib/authSession';
import { severityToPriority } from '@/lib/constants';
import { INCIDENT_QUEUE_EXCLUDED_STATUSES } from '@/lib/incidentAuditUtils';
import {
  fallbackIncidentStatusForDbConstraint,
  isIncidentReportsStatusCheckError,
  incidentMatchesStatusFilter,
} from '@/lib/incidentStatusUtils';

export const useIncidentStore = create((set, get) => ({
  incidents: [],
  currentIncident: null,
  history: [],
  auditLog: [],
  auditLogLoading: false,
  loading: false,
  submitting: false,
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
        .order('created_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false });

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
    set({ submitting: true, error: null });
    try {
      const refResponse = await supabase.rpc('generate_incident_reference');
      const referenceNumber = refResponse.data || `INC-${Date.now()}`;

      const insertPayload = {
        reference_number: referenceNumber,
        reporter_id: reportData.reporterId,
        category: reportData.category,
        description: reportData.description,
        location: reportData.location,
        severity: reportData.severity,
        status: 'Submitted',
      };

      const latitude = Number(reportData.latitude);
      const longitude = Number(reportData.longitude);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        insertPayload.latitude = latitude;
        insertPayload.longitude = longitude;
      }

      let { data: incident, error } = await supabase
        .from('incident_reports')
        .insert(insertPayload)
        .select()
        .single();

      const coordinateColumnError =
        (error?.code === 'PGRST204' || error?.code === '42703') &&
        /latitude|longitude/i.test(error?.message || '');

      if (coordinateColumnError && insertPayload.latitude != null) {
        const { latitude: savedLatitude, longitude: savedLongitude, ...fallbackPayload } = insertPayload;
        const coordNote = `GPS ${Number(savedLatitude).toFixed(5)}, ${Number(savedLongitude).toFixed(5)}`;
        if (!String(fallbackPayload.location || '').includes(coordNote)) {
          fallbackPayload.location = `${fallbackPayload.location} (${coordNote})`.slice(0, 500);
        }
        ({ data: incident, error } = await supabase
          .from('incident_reports')
          .insert(fallbackPayload)
          .select()
          .single());
      }

      if (error) throw error;

      await supabase.from('incident_history').insert({
        incident_id: incident.id,
        changed_by: reportData.reporterId,
        action: 'created',
        new_status: 'Submitted',
        notes: 'Report submitted by user',
      });

      if (files.length > 0) {
        await Promise.all(
          files.map(async (file, index) => {
            const filePath = `${reportData.reporterId}/${incident.id}/${Date.now()}-${index}-${file.name}`;
            const { error: uploadError } = await supabase.storage
              .from('incident-attachments')
              .upload(filePath, file);

            if (uploadError) return;

            const { data: urlData } = supabase.storage.from('incident-attachments').getPublicUrl(filePath);
            await supabase.from('incident_attachments').insert({
              incident_id: incident.id,
              file_url: urlData.publicUrl,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
            });
          })
        );
      }

      const enrichedIncident = { ...incident, reference_number: referenceNumber };

      let notificationWarnings = [];
      try {
        const response = await fetchWithFreshSession('/api/incidents/notify-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incidentId: incident.id }),
        });
        const notificationResult = await response.json();
        if (!response.ok) {
          notificationWarnings = [notificationResult.error || 'Incident notifications could not be sent.'];
        } else {
          notificationWarnings = notificationResult.notificationWarnings || [];
        }
      } catch (notificationError) {
        console.error('[IncidentStore] Report saved but notifications failed:', notificationError);
        notificationWarnings = ['Report submitted, but notifications could not be sent.'];
      }

      set({ submitting: false });
      return { success: true, incident: enrichedIncident, notificationWarnings };
    } catch (err) {
      set({ submitting: false, error: err.message });
      const message = err?.message || 'We could not process your request right now. Please try again.';
      return { success: false, error: message };
    }
  },

  updateIncidentStatus: async (id, status, adminData = {}) => {
    try {
      const buildPatch = (statusValue) => {
        const patch = { status: statusValue };
        if (adminData.assignedTo !== undefined) {
          patch.assigned_to = adminData.assignedTo;
        }
        if (adminData.adminNotes !== undefined) {
          patch.admin_notes = adminData.adminNotes;
        }
        if (adminData.responseActions !== undefined) {
          patch.response_actions = adminData.responseActions;
        }
        return patch;
      };

      const persistUpdate = async (statusValue) => {
        return supabase
          .from('incident_reports')
          .update(buildPatch(statusValue))
          .eq('id', id)
          .select(`
            *,
            reporter:profiles!incident_reports_reporter_id_fkey(id, full_name, phone, email, nationality),
            assignee:profiles!incident_reports_assigned_to_fkey(id, full_name, phone),
            attachments:incident_attachments(*)
          `)
          .single();
      };

      let statusPersisted = status;
      let { data: incident, error } = await persistUpdate(statusPersisted);

      if (error && isIncidentReportsStatusCheckError(error)) {
        const fallback = fallbackIncidentStatusForDbConstraint(status);
        if (fallback && fallback !== status) {
          statusPersisted = fallback;
          ({ data: incident, error } = await persistUpdate(statusPersisted));
        }
      }

      if (error) throw error;

      if (adminData.changedBy) {
        await supabase.from('incident_history').insert({
          incident_id: id,
          changed_by: adminData.changedBy,
          action: adminData.action || 'status_update',
          old_status: adminData.oldStatus,
          new_status: statusPersisted,
          notes: adminData.notes || adminData.adminNotes,
        });
      }

      if (incident.reporter) {
        await notifyUserOfStatusChange(incident);
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
      if (filters.status !== 'All' && !incidentMatchesStatusFilter(filters.status, inc.status)) return false;
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
