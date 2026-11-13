import { fetchWithFreshSession } from '@/lib/authSession';
import { severityToPriority } from '@/lib/constants';

export async function dispatchNotification(payload) {
  const results = { web: null, email: null, sms: null, errors: [] };

  if (!payload?.userId) {
    results.errors.push('Missing recipient user ID');
    return results;
  }

  try {
    const res = await fetchWithFreshSession('/api/notifications/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      results.errors.push(data.error || 'Notification dispatch failed');
      return results;
    }

    return data.results || results;
  } catch (err) {
    results.errors.push(err.message || 'Unknown notification error');
    return results;
  }
}

export async function notifyTouristsOfCrisisAlert(alertId, eventType = 'created') {
  try {
    const res = await fetchWithFreshSession('/api/crisis/alerts/notify-tourists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, eventType }),
    });
    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to notify tourists' };
    }

    return {
      success: true,
      notified: data.notified || 0,
      skipped: data.skipped || 0,
      emailQueued: data.emailQueued || 0,
      smsQueued: data.smsQueued || 0,
      smsDiagnostics: data.smsDiagnostics || null,
      smsPerRecipient: data.smsPerRecipient || [],
      deliveryResults: data.deliveryResults || [],
      warnings: data.warnings || [],
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to notify tourists' };
  }
}

export async function notifyTouristsOfDangerousLocation(warningId, eventType = 'created', channels) {
  try {
    const res = await fetchWithFreshSession('/api/crisis/dangerous-locations/notify-tourists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warningId, eventType, ...(channels ? { channels } : {}) }),
    });
    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to notify tourists' };
    }

    return {
      success: true,
      notified: data.notified || 0,
      skipped: data.skipped || 0,
      emailQueued: data.emailQueued || 0,
      smsQueued: data.smsQueued || 0,
      warnings: data.warnings || [],
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to notify tourists' };
  }
}

export async function notifyTouristsOfRouteAdvisory(advisoryId, eventType = 'created', channels) {
  try {
    const res = await fetchWithFreshSession('/api/crisis/route-advisories/notify-tourists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advisoryId, eventType, ...(channels ? { channels } : {}) }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Failed to notify tourists' };
    return {
      success: true,
      notified: data.notified || 0,
      skipped: data.skipped || 0,
      emailQueued: data.emailQueued || 0,
      smsQueued: data.smsQueued || 0,
      pushSent: data.pushSent || 0,
      warnings: data.errors || data.warnings || [],
    };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to notify tourists' };
  }
}

export async function notifyAdminsOfIncident(incident, adminUsers) {
  const priority = severityToPriority(incident.severity);
  const channels = priority === 'CRITICAL' || priority === 'HIGH'
    ? ['web', 'email', 'sms']
    : ['web', 'email'];

  const promises = adminUsers.map((admin) =>
    dispatchNotification({
      userId: admin.id,
      title: `${incident.severity} Incident Report: ${incident.reference_number}`,
      message: `New ${incident.category} report at ${incident.location}. Status: ${incident.status}. Immediate review required for ${incident.severity} severity reports.`,
      notificationType: 'incident_submitted',
      priority,
      relatedType: 'incident',
      relatedId: incident.id,
      channels,
    })
  );

  return Promise.allSettled(promises);
}

export async function notifyUserOfStatusChange(incident) {
  const priority = severityToPriority(incident.severity);
  return dispatchNotification({
    userId: incident.reporter_id,
    title: `Report ${incident.reference_number} Updated`,
    message: `Your incident report status has been updated to: ${incident.status}.`,
    notificationType: 'incident_status',
    priority,
    relatedType: 'incident',
    relatedId: incident.id,
    channels: ['web', 'email'],
  });
}

export async function notifyTouristAssignmentRequest(tourist, guide, tourGroup, assignmentId) {
  const route = [tourGroup?.starting_location, tourGroup?.destination].filter(Boolean).join(' → ');
  return dispatchNotification({
    userId: tourist.id,
    title: 'Guide Assignment Request',
    message: `${guide.full_name} wants to be your tour guide for ${tourGroup?.name || 'a tour group'}${route ? ` (${route})` : ''}. Open your profile to confirm or decline.`,
    notificationType: 'guide_assignment_request',
    priority: 'HIGH',
    relatedType: 'assignment',
    relatedId: assignmentId,
    channels: ['web', 'email'],
  });
}

export async function notifyGuideAssignmentAccepted(guide, tourist, tourGroup, assignmentId) {
  return dispatchNotification({
    userId: guide.id,
    title: 'Tourist Accepted Assignment',
    message: `${tourist.full_name} confirmed your guide assignment for ${tourGroup?.name || 'the tour group'}.`,
    notificationType: 'guide_assignment_accepted',
    priority: 'NORMAL',
    relatedType: 'assignment',
    relatedId: assignmentId,
    channels: ['web', 'email'],
  });
}

export async function notifyGuideAssignmentDeclined(guide, tourist, tourGroup, assignmentId) {
  return dispatchNotification({
    userId: guide.id,
    title: 'Assignment Request Declined',
    message: `${tourist.full_name} declined your guide assignment request for ${tourGroup?.name || 'the tour group'}.`,
    notificationType: 'guide_assignment_declined',
    priority: 'NORMAL',
    relatedType: 'assignment',
    relatedId: assignmentId,
    channels: ['web'],
  });
}

export async function notifyGuideAssignment(guide, tourist, assignmentId) {
  return dispatchNotification({
    userId: guide.id,
    title: 'New Tourist Assignment',
    message: `You have been assigned to monitor tourist ${tourist.full_name}. Please review their profile and tour schedule.`,
    notificationType: 'guide_assignment',
    priority: 'NORMAL',
    relatedType: 'assignment',
    relatedId: assignmentId,
    channels: ['web', 'email'],
  });
}

export async function notifyTouristGuideAssigned(tourist, guide, assignmentId) {
  return dispatchNotification({
    userId: tourist.id,
    title: 'Tourism Guide Assigned',
    message: `Tourism Guide ${guide.full_name} has been assigned to assist you during your visit to Daet.`,
    notificationType: 'guide_assignment',
    priority: 'NORMAL',
    relatedType: 'assignment',
    relatedId: assignmentId,
    channels: ['web', 'email'],
  });
}
