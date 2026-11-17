import { channelsFromDb } from '@/lib/alertChannels';
import { NOTIFICATION_CHANNELS, severityToPriority } from '@/lib/constants';
import { processNotificationDeliveries } from '@/lib/notificationQueue.server';
import {
  crisisAlertEventKey,
  crisisAlertEventStatusError,
  deliveryIdempotencyKey,
  isUniqueViolation,
  planCrisisRecipientNotification,
} from '@/lib/crisisAlertBroadcastPolicy';
import {
  channelsForBroadcast,
  channelsFromProfile,
  isCriticalSeverity,
  getBroadcastAlertChannels,
  hasProfileEmail,
} from '@/lib/userNotificationChannels';
import { audienceForSeverity, audienceToUserTypes, isProfileInAudience } from '@/lib/notificationAudience';
import { getSystemSettings } from '@/lib/systemSettings.server';
import { formatCrisisAlertSms } from '@/lib/smsMessageFormat';
import { normalizePhilippinePhone } from '@/lib/phoneUtils';
import { isSmsSuspended } from '@/lib/userActivity';
import { sendWebPushToSubscriptions } from '@/lib/webPush.server';
import { normalizeTargetScope } from '@/lib/alertTargeting';
import { CHECKIN_REQUEST_LINE } from '@/lib/alertCheckins';
import { narrowRecipientsForAlert, TARGETING_PROFILE_COLUMNS } from '@/lib/alertAudience.server';

async function loadExistingDeliveryKeys(admin, keys) {
  const found = new Set();
  const size = 100;
  for (let index = 0; index < keys.length; index += size) {
    const slice = keys.slice(index, index + size);
    const { data, error } = await admin
      .from('notification_deliveries')
      .select('idempotency_key')
      .in('idempotency_key', slice);
    if (error) return { keys: found, error };
    for (const row of data || []) {
      if (row.idempotency_key) found.add(row.idempotency_key);
    }
  }
  return { keys: found, error: null };
}

async function insertDeliveryRecords(admin, records) {
  if (!records.length) return { deliveries: [], error: null };
  const { data, error } = await admin
    .from('notification_deliveries')
    .insert(records)
    .select();
  if (!error) return { deliveries: data || [], error: null };
  if (!isUniqueViolation(error)) return { deliveries: [], error };

  const inserted = [];
  for (const record of records) {
    const single = await admin
      .from('notification_deliveries')
      .insert(record)
      .select()
      .single();
    if (!single.error) {
      inserted.push(single.data);
      continue;
    }
    if (isUniqueViolation(single.error)) continue;
    return { deliveries: inserted, error: single.error };
  }
  return { deliveries: inserted, error: null };
}

function emptySmsDiagnostics() {
  return {
    touristsInAudience: 0,
    touristSmsQueued: 0,
    touristNoPhone: 0,
    touristInvalidPhone: 0,
    touristSmsPrefOff: 0,
    touristSmsSuspended: 0,
    guideSmsQueued: 0,
  };
}

export async function broadcastCrisisAlertToTourists(admin, alertId, eventType = 'created') {
  const results = {
    notified: 0,
    skipped: 0,
    emailQueued: 0,
    smsQueued: 0,
    pushSent: 0,
    errors: [],
    smsDiagnostics: emptySmsDiagnostics(),
    smsPerRecipient: [],
  };

  const { data: alert, error: alertError } = await admin
    .from('crisis_alerts')
    .select('*')
    .eq('id', alertId)
    .maybeSingle();

  if (alertError || !alert) {
    results.errors.push(alertError?.message || 'Alert not found');
    return results;
  }

  const statusError = crisisAlertEventStatusError(alert.status, eventType);
  if (statusError) {
    results.errors.push(statusError);
    results.rejected = true;
    return results;
  }

  const alertChannelFlags = channelsFromDb(alert.channels);
  const priority = severityToPriority(alert.severity);
  const isResolved = eventType === 'resolved';
  const isUpdate = eventType === 'updated';
  const eventKey = crisisAlertEventKey(alert, eventType);
  const title = isResolved
    ? `Resolved: ${alert.title}`
    : isUpdate
      ? `${alert.severity} Crisis Alert Updated: ${alert.title}`
      : `${alert.severity} Crisis Alert: ${alert.title}`;
  const allClear = String(alert.all_clear_message || '').trim();
  const message = isResolved
    ? allClear || `This alert is resolved. ${alert.title} at ${alert.location} is no longer an active emergency.`
    : `${alert.type} alert for ${alert.location}. ${alert.message}${alert.checkin_requested ? ` ${CHECKIN_REQUEST_LINE}` : ''}`;
  const smsBody = formatCrisisAlertSms(alert, { resolved: isResolved });
  const notificationType = isResolved
    ? 'crisis_alert_resolved'
    : isUpdate
      ? 'crisis_alert_updated'
      : 'crisis_alert';

  const settings = await getSystemSettings(admin);
  // Critical alerts go to tourists, guides and administrators regardless of the audience setting.
  const audience = audienceForSeverity(settings.notification_audience, alert.severity);
  const audienceTypes = audienceToUserTypes(audience);

  if (audienceTypes.length === 0) {
    results.errors.push('No notification audience enabled in Admin Settings');
    return results;
  }

  const { data: existing, error: existingError } = await admin
    .from('notifications')
    .select('id, user_id')
    .eq('related_type', 'alert')
    .eq('related_id', alertId)
    .eq('event_key', eventKey);

  if (existingError) {
    results.errors.push(existingError.message);
    return results;
  }

  const existingNotificationByUser = new Map((existing || []).map((row) => [row.user_id, row.id]));

  // Who the alert targets: everyone (default), tourists in Daet now, or near the alert's area.
  const targetScope = normalizeTargetScope(alert.target_scope);
  results.targetScope = targetScope;
  const profileColumns = 'id, email, phone, user_type, notification_channels, sms_suspended_at, inactive_notice_sent_at'
    + (targetScope === 'all' ? '' : TARGETING_PROFILE_COLUMNS);

  const { data: recipients, error: recipientError } = await admin
    .from('profiles')
    .select(profileColumns)
    .in('user_type', audienceTypes)
    .eq('is_active', true);

  if (recipientError) {
    results.errors.push(recipientError.message);
    return results;
  }

  let toNotify = (recipients || []).filter((profile) => isProfileInAudience(profile, audience));

  // Narrow tourists only; guides and administrators get the alert as before.
  if (targetScope !== 'all') {
    const narrowed = await narrowRecipientsForAlert(admin, toNotify, alert);
    // On a targeting error everyone is kept: never silently drop people from a crisis alert.
    if (narrowed.error) results.errors.push(narrowed.error);
    toNotify = narrowed.profiles;
    results.outsideTarget = narrowed.outsideTarget;
  }
  results.skipped = (recipients || []).length - toNotify.length;

  const candidateKeys = toNotify.flatMap((profile) => [
    deliveryIdempotencyKey(profile.id, eventKey, 'email'),
    deliveryIdempotencyKey(profile.id, eventKey, 'sms'),
  ]);
  const existingDeliveries = await loadExistingDeliveryKeys(admin, candidateKeys);
  if (existingDeliveries.error) {
    results.errors.push(existingDeliveries.error.message);
    return results;
  }

  if (toNotify.length === 0) {
    return results;
  }

  const deliveryRecords = [];
  // Critical alerts reach everyone on every channel the alert uses, even channels people turned
  // off in Profile and SMS paused for inactivity. Other severities follow each person's settings.
  const isCritical = isCriticalSeverity(alert.severity);

  for (const profile of toNotify) {
    const isTourist = profile.user_type === 'tourist';
    const userChannels = isCritical
      ? channelsForBroadcast(profile, alert.severity)
      : channelsFromProfile(profile);
    const effective = getBroadcastAlertChannels(alertChannelFlags, userChannels);
    const sendEmail = effective.email && hasProfileEmail(profile);
    const normalizedPhone = normalizePhilippinePhone(profile.phone);
    const sendSms = Boolean(effective.sms && normalizedPhone);
    const plan = planCrisisRecipientNotification({
      userId: profile.id,
      eventKey,
      alreadyNotified: existingNotificationByUser.has(profile.id),
      sendInApp: effective.app || effective.push,
      sendEmail,
      sendSms,
      existingDeliveryKeys: existingDeliveries.keys,
    });
    if (plan.skip) {
      results.skipped += 1;
      continue;
    }
    if (isTourist) results.smsDiagnostics.touristsInAudience += 1;

    if (alertChannelFlags.sms && isTourist) {
      let skipReason = null;
      if (isSmsSuspended(profile) && !isCritical) {
        results.smsDiagnostics.touristSmsSuspended += 1;
        skipReason = 'sms_suspended';
      } else if (!profile.phone) {
        results.smsDiagnostics.touristNoPhone += 1;
        skipReason = 'no_phone';
      } else if (!normalizedPhone) {
        results.smsDiagnostics.touristInvalidPhone += 1;
        skipReason = 'invalid_phone';
      } else if (!userChannels.sms) {
        results.smsDiagnostics.touristSmsPrefOff += 1;
        skipReason = 'sms_pref_off';
      }

      results.smsPerRecipient.push({
        userId: profile.id,
        name: profile.full_name || 'Tourist',
        phoneMasked: normalizedPhone
          ? `${normalizedPhone.slice(0, 4)}…${normalizedPhone.slice(-3)}`
          : null,
        network: null,
        queued: plan.queueSms,
        skipReason: plan.queueSms ? null : (sendSms ? 'already_queued' : skipReason || 'not_eligible'),
      });
    }

    let notificationId = existingNotificationByUser.get(profile.id) || null;

    if (plan.insertNotification) {
      const { data: notification, error: notifError } = await admin
        .from('notifications')
        .insert({
          user_id: profile.id,
          title,
          message,
          notification_type: notificationType,
          priority,
          related_type: 'alert',
          related_id: alertId,
          event_key: eventKey,
        })
        .select('id')
        .single();

      if (notifError) {
        if (!isUniqueViolation(notifError)) {
          results.errors.push(notifError.message);
          continue;
        }
      } else {

        notificationId = notification.id;
        existingNotificationByUser.set(profile.id, notification.id);
        results.notified += 1;
      }
    }

    if (effective.push && notificationId) {
      const pushResult = await sendWebPushToSubscriptions(
        admin,
        profile.id,
        {
          id: notificationId,
          title,
          message,
          priority,
          related_type: 'alert',
          related_id: alertId,
        },
        { userType: profile.user_type }
      );
      results.pushSent += pushResult.sent || 0;
      results.errors.push(...(pushResult.errors || []));
    }

    if (plan.queueEmail) {
      deliveryRecords.push({
        notification_id: notificationId,
        user_id: profile.id,
        channel: NOTIFICATION_CHANNELS.EMAIL,
        status: 'pending',
        recipient: profile.email,
        subject: title,
        body: message,
        priority,
        idempotency_key: plan.emailKey,
      });
    }

    if (plan.queueSms) {
      deliveryRecords.push({
        notification_id: notificationId,
        user_id: profile.id,
        channel: NOTIFICATION_CHANNELS.SMS,
        status: 'pending',
        recipient: normalizedPhone,
        subject: title,
        body: smsBody,
        priority,
        idempotency_key: plan.smsKey,
      });
      if (isTourist) results.smsDiagnostics.touristSmsQueued += 1;
      else results.smsDiagnostics.guideSmsQueued += 1;
    }
  }

  if (deliveryRecords.length === 0) {
    return results;
  }

  const { deliveries, error: deliveryError } = await insertDeliveryRecords(admin, deliveryRecords);

  if (deliveryError) {
    results.errors.push(`Delivery queue failed: ${deliveryError.message}`);
    if (!deliveries.length) return results;
  }

  results.emailQueued = (deliveries || []).filter((d) => d.channel === 'email').length;
  results.smsQueued = (deliveries || []).filter((d) => d.channel === 'sms').length;

  const processResult = await processNotificationDeliveries({
    deliveryIds: (deliveries || []).map((d) => d.id),
  }).catch((err) => ({
    processed: 0,
    results: [],
    message: err.message,
  }));
  results.deliveryResults = processResult.results || [];

  const smsDeliveryIdByUser = {};
  for (const d of deliveries || []) {
    if (d.channel === 'sms') smsDeliveryIdByUser[d.user_id] = d.id;
  }
  for (const row of results.smsPerRecipient) {
    const deliveryId = smsDeliveryIdByUser[row.userId];
    if (!deliveryId) continue;
    const outcome = (processResult.results || []).find((r) => r.id === deliveryId);
    if (!outcome) continue;
    row.status = outcome.status;
    row.messageId = outcome.messageId || null;
    row.error = outcome.error || null;
    row.detectedNetwork = outcome.detectedNetwork || row.network;
  }

  if (processResult.message) {
    results.errors.push(`Delivery processing failed: ${processResult.message}`);
  }

  const deliveryFailures = (processResult.results || []).filter(
    (r) => r.status === 'failed' || r.status === 'retrying'
  );
  if (deliveryFailures.length && results.smsPerRecipient.length === 0) {
    results.errors.push(
      `Delivery issues: ${deliveryFailures.map((r) => r.error || r.status).join('; ')}`
    );
  }

  const diag = results.smsDiagnostics;
  if (alertChannelFlags.sms && diag.touristsInAudience > 0 && diag.touristSmsQueued === 0) {
    results.errors.push(
      `No tourist SMS queued: ${diag.touristNoPhone} missing phone, ${diag.touristInvalidPhone} invalid phone, ${diag.touristSmsPrefOff} SMS off in profile, ${diag.touristSmsSuspended} SMS suspended (inactive 30+ days).`
    );
  }

  return results;
}
