import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/emailService';
import { sendSms } from '@/lib/smsService';

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
  } else {
    result = { success: true, skipped: true };
  }

  if (result.success || result.skipped) {
    await supabase
      .from('notification_deliveries')
      .update({
        status: result.skipped ? 'cancelled' : 'sent',
        sent_at: new Date().toISOString(),
        last_error: result.skipped ? 'Channel not configured' : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', delivery.id);
    return { id: delivery.id, status: result.skipped ? 'cancelled' : 'sent' };
  }

  const newRetryCount = (delivery.retry_count || 0) + 1;
  const shouldRetry = newRetryCount < (delivery.max_retries || MAX_RETRIES);

  await supabase
    .from('notification_deliveries')
    .update({
      status: shouldRetry ? 'retrying' : 'failed',
      retry_count: newRetryCount,
      last_error: result.error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', delivery.id);

  return { id: delivery.id, status: shouldRetry ? 'retrying' : 'failed', error: result.error };
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
