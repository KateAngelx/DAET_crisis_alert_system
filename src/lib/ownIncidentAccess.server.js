/** Incident reports visible only when the user is the reporter. */

export function canAccessOwnIncident(userId, incident) {
  return Boolean(incident?.id && userId && incident.reporter_id === userId);
}

export async function listOwnIncidents(admin, userId) {
  const { data, error } = await admin
    .from("incident_reports")
    .select(`
      *,
      reporter:profiles!incident_reports_reporter_id_fkey(id, full_name, phone, email, nationality),
      assignee:profiles!incident_reports_assigned_to_fkey(id, full_name, phone),
      attachments:incident_attachments(*)
    `)
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function loadOwnIncidentDetail(admin, userId, incidentId) {
  const { data: incident, error } = await admin
    .from("incident_reports")
    .select(`
      *,
      reporter:profiles!incident_reports_reporter_id_fkey(id, full_name, phone, email, nationality),
      assignee:profiles!incident_reports_assigned_to_fkey(id, full_name, phone),
      attachments:incident_attachments(*)
    `)
    .eq("id", incidentId)
    .maybeSingle();
  if (error) throw error;
  if (!incident) return { incident: null, history: [] };
  if (!canAccessOwnIncident(userId, incident)) {
    return { incident: null, history: [], forbidden: true };
  }

  const { data: history, error: historyError } = await admin
    .from("incident_history")
    .select("*, changer:profiles!incident_history_changed_by_fkey(full_name)")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: false });
  if (historyError) throw historyError;

  return { incident, history: history || [] };
}