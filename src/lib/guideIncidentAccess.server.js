/** Which incident reports a guide may read (own reports, assignments, tourists on active tours). */

export async function getActiveTouristIdsForGuide(admin, guideId) {
  const { data: activeGroups, error: groupError } = await admin
    .from("tour_groups")
    .select("id")
    .eq("guide_id", guideId)
    .eq("status", "active");
  if (groupError) throw groupError;

  const groupIds = (activeGroups || []).map((group) => group.id);
  if (!groupIds.length) return [];

  const { data: assignments, error } = await admin
    .from("guide_assignments")
    .select("tourist_id")
    .eq("guide_id", guideId)
    .eq("status", "active")
    .in("tour_group_id", groupIds);
  if (error) throw error;

  return [...new Set((assignments || []).map((row) => row.tourist_id).filter(Boolean))];
}

export async function canGuideAccessIncident(admin, guideId, incident) {
  if (!incident?.id || !guideId) return false;
  if (incident.reporter_id === guideId) return true;
  if (incident.assigned_to === guideId) return true;

  const touristIds = await getActiveTouristIdsForGuide(admin, guideId);
  return touristIds.includes(incident.reporter_id);
}

export async function listGuideVisibleIncidents(admin, guideId) {
  const touristIds = await getActiveTouristIdsForGuide(admin, guideId);
  const orParts = [`reporter_id.eq.${guideId}`, `assigned_to.eq.${guideId}`];
  if (touristIds.length) {
    orParts.push(`reporter_id.in.(${touristIds.join(",")})`);
  }

  const { data, error } = await admin
    .from("incident_reports")
    .select(`
      *,
      reporter:profiles!incident_reports_reporter_id_fkey(id, full_name, phone)
    `)
    .or(orParts.join(","))
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (error) throw error;
  return data || [];
}