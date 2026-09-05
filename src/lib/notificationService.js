import { supabase } from '@/lib/supabaseClient';
import { severityToPriority, NOTIFICATION_CHANNELS } from '@/lib/constants';

function generateIdempotencyKey(userId, type, relatedId, channel) {
  return `${userId}-${type}-${relatedId || 'none'}-${channel}-${Date.now()}`;
}

export async function dispatchNotification({
  userId,
  title,
  message,
  notificationType = 'general',
  priority = 'NORMAL',
  relatedType = null,
  relatedId = null,
  channels = ['web', 'email'],
  recipientEmail = null,
  recipientPhone = null,
}) {
  const results = { web: null, email: null, sms: null, errors: [] };

  try {
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        notification_type: notificationType,
        priority,
        related_type: relatedType,
        related_id: relatedId,
      })
      .select()
      .single();

    if (notifError) {
      results.errors.push(`Web notification failed: ${notifError.message}`);
    } else {
      results.web = notification;
    }

    const deliveryRecords = [];

    if (channels.includes('email') && recipientEmail) {
      deliveryRecords.push({
        notification_id: notification?.id,
        user_id: userId,
        channel: NOTIFICATION_CHANNELS.EMAIL,
        status: 'pending',
        recipient: recipientEmail,
        subject: title,
        body: message,
        priority,
        idempotency_key: generateIdempotencyKey(userId, notificationType, relatedId, 'email'),
      });
    }

    if (channels.includes('sms') && recipientPhone) {
      deliveryRecords.push({
        notification_id: notification?.id,
        user_id: userId,
        channel: NOTIFICATION_CHANNELS.SMS,
        status: 'pending',
        recipient: recipientPhone,
        subject: title,
        body: message,
        priority,
        idempotency_key: generateIdempotencyKey(userId, notificationType, relatedId, 'sms'),
      });
    }

    if (deliveryRecords.length > 0) {
      const { data: deliveries, error: deliveryError } = await supabase
        .from('notification_deliveries')
        .insert(deliveryRecords)
        .select();

      if (deliveryError) {
        results.errors.push(`Delivery queue failed: ${deliveryError.message}`);
      } else {
        for (const d of deliveries || []) {
          results[d.channel] = d;
        }

        try {
          await fetch('/api/notifications/process-queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deliveryIds: (deliveries || []).map((d) => d.id) }),
          });
        } catch {
          // Queue will be retried later; main transaction continues
        }
      }
    }
  } catch (err) {
    results.errors.push(err.message || 'Unknown notification error');
  }

  return results;
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
      recipientEmail: admin.email,
      recipientPhone: admin.phone,
    })
  );

  return Promise.allSettled(promises);
}

export async function notifyUserOfStatusChange(incident, userProfile) {
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
    recipientEmail: userProfile?.email,
    recipientPhone: userProfile?.phone,
  });
}

export async function notifyTouristAssignmentRequest(tourist, guide, tourGroup) {
  const route = [tourGroup?.starting_location, tourGroup?.destination].filter(Boolean).join(' → ');
  return dispatchNotification({
    userId: tourist.id,
    title: 'Guide Assignment Request',
    message: `${guide.full_name} wants to be your tour guide for ${tourGroup?.name || 'a tour group'}${route ? ` (${route})` : ''}. Open your profile to confirm or decline.`,
    notificationType: 'guide_assignment_request',
    priority: 'HIGH',
    relatedType: 'assignment',
    relatedId: tourGroup?.id,
    channels: ['web', 'email'],
    recipientEmail: tourist.email,
    recipientPhone: tourist.phone,
  });
}

export async function notifyGuideAssignmentAccepted(guide, tourist, tourGroup) {
  return dispatchNotification({
    userId: guide.id,
    title: 'Tourist Accepted Assignment',
    message: `${tourist.full_name} confirmed your guide assignment for ${tourGroup?.name || 'the tour group'}.`,
    notificationType: 'guide_assignment_accepted',
    priority: 'NORMAL',
    relatedType: 'assignment',
    relatedId: tourist.id,
    channels: ['web', 'email'],
    recipientEmail: guide.email,
    recipientPhone: guide.phone,
  });
}

export async function notifyGuideAssignmentDeclined(guide, tourist, tourGroup) {
  return dispatchNotification({
    userId: guide.id,
    title: 'Assignment Request Declined',
    message: `${tourist.full_name} declined your guide assignment request for ${tourGroup?.name || 'the tour group'}.`,
    notificationType: 'guide_assignment_declined',
    priority: 'NORMAL',
    relatedType: 'assignment',
    relatedId: tourist.id,
    channels: ['web'],
    recipientEmail: guide.email,
  });
}

export async function notifyGuideAssignment(guide, tourist, assignedBy) {
  return dispatchNotification({
    userId: guide.id,
    title: 'New Tourist Assignment',
    message: `You have been assigned to monitor tourist ${tourist.full_name}. Please review their profile and tour schedule.`,
    notificationType: 'guide_assignment',
    priority: 'NORMAL',
    relatedType: 'assignment',
    relatedId: tourist.id,
    channels: ['web', 'email'],
    recipientEmail: guide.email,
    recipientPhone: guide.phone,
  });
}

export async function notifyTouristGuideAssigned(tourist, guide) {
  return dispatchNotification({
    userId: tourist.id,
    title: 'Tourism Guide Assigned',
    message: `Tourism Guide ${guide.full_name} has been assigned to assist you during your visit to Daet.`,
    notificationType: 'guide_assignment',
    priority: 'NORMAL',
    relatedType: 'assignment',
    relatedId: guide.id,
    channels: ['web', 'email'],
    recipientEmail: tourist.email,
    recipientPhone: tourist.phone,
  });
}
