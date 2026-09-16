import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/emailService';
import { isPermanentSmsError, sendSms } from '@/lib/smsService';
import { agentDebugLog } from '@/lib/agentDebugLog.server';

const MAX_RETRIES = 3;

async function processDelivery(supabase, delivery) {
  await supabase
    .from('notification_deliveries')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', delivery.id);

  let result;
  if (delivery.channel === 'email') {
    result = await sendEmail({
      to: delivery.recipient,
      subject: delivery.subject || 'CONNECT-DAET Notification',
      body: delivery.body,
    });
  } else if (delivery.channel === 'sms') {
    result = await sendSms({ to: delivery.recipient, message: delivery.body });
    agentDebugLog({
      sessionId: '197cec',
      location: 'notificationQueue.server.js:processDelivery',
      message: 'SMS delivery processed',
      hypothesisId: 'G-globe',
      runId: 'sms-globe-v1',
      data: {
        deliveryId: delivery.id,
        userId: delivery.user_id,
        recipientPrefix: String(delivery.recipient || '').slice(0, 4),
        success: result.success,
        skipped: Boolean(result.skipped),
        permanent: Boolean(result.permanent),
        error: result.error || null,
        messageId: result.messageId || null,
        apiAttempts: result.apiAttempts ?? 1,
        detectedNetwork: result.detectedNetwork || null,
        billed: Boolean(result.billed),
      },
    });
  } else {
    result = { success: true, skipped: true };
  }

  if (result.success || result.skipped) {
    await supabase
      .from('notification_deliveries')
      .update({
        status: result.skipped ? 'failed' : 'sent',
        sent_at: result.skipped ? null : new Date().toISOString(),
        last_error: result.skipped ? (result.error || 'Channel not configured') : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', delivery.id);
    return {
      id: delivery.id,
      channel: delivery.channel,
      status: result.skipped ? 'failed' : 'sent',
      error: result.skipped ? (result.error || 'Channel not configured') : null,
      messageId: result.messageId || null,
      billed: Boolean(result.billed),
      detectedNetwork: result.detectedNetwork || null,
    };
  }

  const newRetryCount = (delivery.retry_count || 0) + 1;
  const permanentFailure =
    delivery.channel === 'sms' && (result.permanent || isPermanentSmsError(result.error));
  const shouldRetry =
    !permanentFailure && newRetryCount < (delivery.max_retries || MAX_RETRIES);

  await supabase
    .from('notification_deliveries')
    .update({
      status: shouldRetry ? 'retrying' : 'failed',
      retry_count: newRetryCount,
      last_error: result.error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', delivery.id);

  return {
    id: delivery.id,
    channel: delivery.channel,
    status: shouldRetry ? 'retrying' : 'failed',
    error: result.error,
    errorCode: result.errorCode,
    billed: Boolean(result.billed),
    detectedNetwork: result.detectedNetwork || null,
  };
}

export async function processNotificationDeliveries({ deliveryIds } = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { processed: 0, results: [], message: 'SUPABASE_SERVICE_ROLE_KEY required' };
  }

  let query = supabase
    .from('notification_deliveries')
    .select('*')
    .in('status', ['pending', 'retrying'])
    .order('created_at', { ascending: true })
    .limit(20);

  if (deliveryIds?.length) {
    query = supabase.from('notification_deliveries').select('*').in('id', deliveryIds);
  }

  const { data: deliveries, error } = await query;
  if (error) throw error;

  const results = [];
  for (const delivery of deliveries || []) {
    results.push(await processDelivery(supabase, delivery));
  }

  return { processed: results.length, results };
}
