import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { NOTIFICATION_CHANNELS } from '@/lib/constants';
import { processNotificationDeliveries } from '@/lib/notificationQueue.server';
import { verifiedDeliveryContacts } from '@/lib/verifiedDeliveryContacts';
import { channelsFromProfile, getDispatchChannelsForProfile } from '@/lib/userNotificationChannels';

function isMissingEventKeyColumn(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    (error?.code === '42703' || error?.code === 'PGRST204')
    && message.includes('event_key')
  );
}

export async function dispatchNotificationServer({
  userId,
  title,
  message,
  notificationType = 'general',
  priority = 'NORMAL',
  relatedType = null,
  relatedId = null,
  eventKey = null,
  channels = ['web', 'email'],
  criticalEmergency = false,
  adminClient = null,
  processDeliveries = processNotificationDeliveries,
}) {
  const results = { web: null, email: null, sms: null, errors: [] };
  const admin = adminClient || getSupabaseAdmin();

  if (!admin) {
    results.errors.push('Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required');
    return results;
  }

  if (!userId) {
    results.errors.push('Missing recipient user ID');
    return results;
  }

  const { data: recipient, error: recipientError } = await admin
    .from('profiles')
    .select('id, user_type, notification_channels, email, phone, sms_suspended_at')
    .eq('id', userId)
    .maybeSingle();

  if (recipientError || !recipient) {
    results.errors.push('Recipient user not found');
    return results;
  }

  const verified = await lookupVerifiedContacts(admin, userId);
  const emailTo = verified.email;
  const phoneTo = verified.phone;
  const effective = criticalEmergency
    ? {
        app: channels.includes('web') || channels.includes('app'),
        email: channels.includes('email') && Boolean(emailTo),
        sms: channels.includes('sms') && Boolean(phoneTo) && channelsFromProfile(recipient).sms,
        push: (channels.includes('web') || channels.includes('app')) && channelsFromProfile(recipient).push,
      }
    : getDispatchChannelsForProfile(recipient, channels);

  if (
    !criticalEmergency
    && recipient.user_type === "admin"
    && (channels.includes("web") || channels.includes("app"))
  ) {
    effective.app = true;
  }

  try {
    let notification = null;

    if (effective.app || effective.push) {
      const notificationData = {
        user_id: userId,
        title,
        message,
        notification_type: notificationType,
        priority,
        related_type: relatedType,
        related_id: relatedId,
        ...(eventKey ? { event_key: eventKey } : {}),
      };
      let { data: inserted, error: notifError } = await admin
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (notifError && eventKey && isMissingEventKeyColumn(notifError)) {
        console.warn('[NotificationDispatch] notifications.event_key is missing; retrying without deduplication.');
        const { event_key: _eventKey, ...legacyNotificationData } = notificationData;
        ({ data: inserted, error: notifError } = await admin
          .from('notifications')
          .insert(legacyNotificationData)
          .select()
          .single());
      }

      if (notifError) {
        if (notifError.code === '23505' && eventKey) {
          results.duplicate = true;
          return results;
        }
        results.errors.push(`Web notification failed: ${notifError.message}`);
      } else {
        notification = inserted;
        results.web = inserted;
      }
    }

    if (notification && effective.push) {
      const { sendWebPushToSubscriptions } = await import('@/lib/webPush.server');
      results.push = await sendWebPushToSubscriptions(admin, userId, notification, {
        userType: recipient.user_type,
      });
      if (results.push.errors?.length) results.errors.push(...results.push.errors);
    }

    const deliveryRecords = [];

    if (effective.email && emailTo) {
      deliveryRecords.push({
        notification_id: notification?.id,
        user_id: userId,
        channel: NOTIFICATION_CHANNELS.EMAIL,
        status: 'pending',
        recipient: emailTo,
        subject: title,
        body: message,
        priority,
        idempotency_key: generateIdempotencyKey(userId, notificationType, relatedId, 'email', eventKey),
      });
    }

    if (effective.sms && phoneTo) {
      deliveryRecords.push({
        notification_id: notification?.id,
        user_id: userId,
        channel: NOTIFICATION_CHANNELS.SMS,
        status: 'pending',
        recipient: phoneTo,
        subject: title,
        body: message,
        priority,
        idempotency_key: generateIdempotencyKey(userId, notificationType, relatedId, 'sms', eventKey),
      });
    }

    if (deliveryRecords.length > 0) {
      const { data: deliveries, error: deliveryError } = await admin
        .from('notification_deliveries')
        .insert(deliveryRecords)
        .select();

      if (deliveryError) {
        if (deliveryError.code === '23505' && eventKey) {
          results.duplicate = true;
        } else {
          results.errors.push(`Delivery queue failed: ${deliveryError.message}`);
        }
      } else {
        for (const d of deliveries || []) {
          results[d.channel] = d;
        }
        await processDeliveries({ deliveryIds: (deliveries || []).map((d) => d.id) });
      }
    }
  } catch (err) {
    results.errors.push(err.message || 'Unknown notification error');
  }

  return results;
}

function generateIdempotencyKey(userId, type, relatedId, channel, eventKey) {
  return `${userId}-${type}-${relatedId || 'none'}-${channel}-${eventKey || Date.now()}`;
}

async function lookupVerifiedContacts(admin, userId) {
  try {
    if (!admin.auth?.admin?.getUserById) return { email: null, phone: null };
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) return { email: null, phone: null };
    return verifiedDeliveryContacts(data?.user);
  } catch {
    return { email: null, phone: null };
  }
}
