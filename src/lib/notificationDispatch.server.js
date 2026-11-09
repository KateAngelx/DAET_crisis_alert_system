import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { NOTIFICATION_CHANNELS } from '@/lib/constants';
import { processNotificationDeliveries } from '@/lib/notificationQueue.server';
import { channelsFromProfile, getDispatchChannelsForProfile } from '@/lib/userNotificationChannels';
import { getSystemSettings } from '@/lib/systemSettings.server';

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
  recipientEmail = null,
  recipientPhone = null,
  criticalEmergency = false,
}) {
  const results = { web: null, email: null, sms: null, errors: [] };
  const admin = getSupabaseAdmin();

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

  const settings = await getSystemSettings(admin);
  const emailTo = recipientEmail || recipient.email;
  const phoneTo = recipientPhone || recipient.phone;
  const effective = criticalEmergency
    ? {
        app: channels.includes('web') || channels.includes('app'),
        email: channels.includes('email') && Boolean(emailTo),
        sms: channels.includes('sms') && Boolean(phoneTo) && channelsFromProfile(recipient).sms,
        push: (channels.includes('web') || channels.includes('app')) && channelsFromProfile(recipient).push,
      }
    : getDispatchChannelsForProfile(
        recipient,
        channels,
        settings.notification_audience
      );

  try {
    let notification = null;

    if (effective.app || effective.push) {
      const { data: inserted, error: notifError } = await admin
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          notification_type: notificationType,
          priority,
          related_type: relatedType,
          related_id: relatedId,
          event_key: eventKey,
        })
        .select()
        .single();

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
        results.errors.push(`Delivery queue failed: ${deliveryError.message}`);
      } else {
        for (const d of deliveries || []) {
          results[d.channel] = d;
        }
        await processNotificationDeliveries({ deliveryIds: (deliveries || []).map((d) => d.id) });
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
