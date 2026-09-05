import { channelsFromDb } from '@/lib/alertChannels';
import { NOTIFICATION_CHANNELS, severityToPriority } from '@/lib/constants';
import { processNotificationDeliveries } from '@/lib/notificationQueue.server';

export async function broadcastCrisisAlertToTourists(admin, alertId) {
  const results = { notified: 0, skipped: 0, emailQueued: 0, smsQueued: 0, errors: [] };

  const { data: alert, error: alertError } = await admin
    .from('crisis_alerts')
    .select('*')
    .eq('id', alertId)
    .maybeSingle();

  if (alertError || !alert) {
    results.errors.push(alertError?.message || 'Alert not found');
    return results;
  }

  const channelFlags = channelsFromDb(alert.channels);
  const dispatchChannels = ['web'];
  if (channelFlags.email) dispatchChannels.push('email');
  if (channelFlags.sms) dispatchChannels.push('sms');

  const priority = severityToPriority(alert.severity);
  const title = `${alert.severity} Crisis Alert: ${alert.title}`;
  const message = `${alert.type} alert for ${alert.location}. ${alert.message}`;

  const { data: existing, error: existingError } = await admin
    .from('notifications')
    .select('user_id')
    .eq('related_type', 'alert')
    .eq('related_id', alertId);

  if (existingError) {
    results.errors.push(existingError.message);
    return results;
  }

  const alreadyNotified = new Set((existing || []).map((row) => row.user_id));

  const { data: tourists, error: touristError } = await admin
    .from('profiles')
    .select('id, email, phone')
    .eq('user_type', 'tourist')
    .eq('is_active', true);

  if (touristError) {
    results.errors.push(touristError.message);
    return results;
  }

  const toNotify = (tourists || []).filter((tourist) => !alreadyNotified.has(tourist.id));
  results.skipped = (tourists || []).length - toNotify.length;

  if (toNotify.length === 0) {
    return results;
  }

  const notificationRows = toNotify.map((tourist) => ({
    user_id: tourist.id,
    title,
    message,
    notification_type: 'crisis_alert',
    priority,
    related_type: 'alert',
    related_id: alertId,
  }));

  const { data: insertedNotifications, error: insertError } = await admin
    .from('notifications')
    .insert(notificationRows)
    .select('id, user_id');

  if (insertError) {
    results.errors.push(insertError.message);
    return results;
  }

  results.notified = insertedNotifications?.length || 0;

  if (!dispatchChannels.includes('email') && !dispatchChannels.includes('sms')) {
    return results;
  }

  const notificationByUser = new Map(
    (insertedNotifications || []).map((notification) => [notification.user_id, notification.id])
  );
  const deliveryRecords = [];

  for (const tourist of toNotify) {
    const notificationId = notificationByUser.get(tourist.id);
    if (!notificationId) continue;

    if (dispatchChannels.includes('email') && tourist.email) {
      deliveryRecords.push({
        notification_id: notificationId,
        user_id: tourist.id,
        channel: NOTIFICATION_CHANNELS.EMAIL,
        status: 'pending',
        recipient: tourist.email,
        subject: title,
        body: message,
        priority,
        idempotency_key: `${tourist.id}-crisis_alert-${alertId}-email`,
      });
    }

    if (dispatchChannels.includes('sms') && tourist.phone) {
      deliveryRecords.push({
        notification_id: notificationId,
        user_id: tourist.id,
        channel: NOTIFICATION_CHANNELS.SMS,
        status: 'pending',
        recipient: tourist.phone,
        subject: title,
        body: message,
        priority,
        idempotency_key: `${tourist.id}-crisis_alert-${alertId}-sms`,
      });
    }
  }

  if (deliveryRecords.length === 0) {
    return results;
  }

  const { data: deliveries, error: deliveryError } = await admin
    .from('notification_deliveries')
    .insert(deliveryRecords)
    .select();

  if (deliveryError) {
    results.errors.push(`Delivery queue failed: ${deliveryError.message}`);
    return results;
  }

  results.emailQueued = (deliveries || []).filter((delivery) => delivery.channel === 'email').length;
  results.smsQueued = (deliveries || []).filter((delivery) => delivery.channel === 'sms').length;

  await processNotificationDeliveries({ deliveryIds: (deliveries || []).map((delivery) => delivery.id) });

  return results;
}
