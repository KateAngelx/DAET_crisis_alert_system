import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/emailService';
import { isPermanentSmsError, sendSms } from '@/lib/smsService';

const MAX_RETRIES = 3;
const MAX_BATCH_SIZE = 50;
const DELIVERY_CONCURRENCY = 5;
/** Stop starting new sends after this long so the request finishes before the host's time limit. */
const DEFAULT_TIME_BUDGET_MS = 45_000;
/** A row left in "processing" this long means the request that claimed it died mid-send. */
export const STUCK_PROCESSING_MS = 10 * 60_000;
/** Pending or retrying rows older than this are too late to be useful and are cancelled. */
export const STALE_DELIVERY_MS = 12 * 60 * 60_000;

const CLAIMABLE_STATUSES = ['pending', 'retrying'];
const URGENT_PRIORITIES = ['CRITICAL', 'HIGH'];
const OTHER_PRIORITIES = ['NORMAL', 'LOW'];

const defaultSenders = { email: sendEmail, sms: sendSms };

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

/**
 * Atomically move a row from pending/retrying to processing.
 * Returns false when another request already claimed or finished it, so it is never sent twice.
 */
async function claimDelivery(supabase, delivery, clock) {
  const { data, error } = await supabase
    .from('notification_deliveries')
    .update({ status: 'processing', updated_at: nowIso(clock) })
    .eq('id', delivery.id)
    .in('status', CLAIMABLE_STATUSES)
    .select('id');
  if (error) throw error;
  return Boolean(data?.length);
}

async function processDelivery(supabase, delivery, { senders, clock }) {
  const maxRetries = delivery.max_retries ?? MAX_RETRIES;
  if ((delivery.retry_count || 0) >= maxRetries) {
    await supabase
      .from('notification_deliveries')
      .update({
        status: 'failed',
        last_error: delivery.last_error || 'Max retries exceeded',
        updated_at: nowIso(clock),
      })
      .eq('id', delivery.id)
      .in('status', CLAIMABLE_STATUSES);
    return {
      id: delivery.id,
      channel: delivery.channel,
      status: 'failed',
      error: delivery.last_error || 'Max retries exceeded',
    };
  }

  if (!(await claimDelivery(supabase, delivery, clock))) {
    return { id: delivery.id, channel: delivery.channel, status: 'skipped', claimedElsewhere: true };
  }

  let result;
  try {
    if (delivery.channel === 'email') {
      result = await senders.email({
        to: delivery.recipient,
        subject: delivery.subject || 'CONNECT-DAET Notification',
        body: delivery.body,
      });
    } else if (delivery.channel === 'sms') {
      result = await senders.sms({ to: delivery.recipient, message: delivery.body });
    } else {
      result = { success: true, skipped: true };
    }
  } catch (err) {
    result = { success: false, error: err?.message || 'Send failed' };
  }

  if (result.success || result.skipped) {
    await supabase
      .from('notification_deliveries')
      .update({
        status: result.skipped ? 'failed' : 'sent',
        sent_at: result.skipped ? null : nowIso(clock),
        last_error: result.skipped ? (result.error || 'Channel not configured') : null,
        updated_at: nowIso(clock),
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
  const shouldRetry = !permanentFailure && newRetryCount < maxRetries;

  await supabase
    .from('notification_deliveries')
    .update({
      status: shouldRetry ? 'retrying' : 'failed',
      retry_count: newRetryCount,
      last_error: result.error,
      updated_at: nowIso(clock),
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

/** Rows stuck in "processing" go back to "retrying" (counted as one attempt) so they are sent. */
async function recoverStuckDeliveries(supabase, clock) {
  const cutoff = new Date(clock() - STUCK_PROCESSING_MS).toISOString();
  const { data: stuck, error } = await supabase
    .from('notification_deliveries')
    .select('id, retry_count')
    .eq('status', 'processing')
    .lt('updated_at', cutoff)
    .limit(MAX_BATCH_SIZE);
  if (error) throw error;

  let recovered = 0;
  for (const row of stuck || []) {
    const { data, error: updateError } = await supabase
      .from('notification_deliveries')
      .update({
        status: 'retrying',
        retry_count: (row.retry_count || 0) + 1,
        last_error: 'Previous send attempt did not finish',
        updated_at: nowIso(clock),
      })
      .eq('id', row.id)
      .eq('status', 'processing')
      .select('id');
    if (updateError) throw updateError;
    if (data?.length) recovered += 1;
  }
  return recovered;
}

async function cancelStaleDeliveries(supabase, clock) {
  const cutoff = new Date(clock() - STALE_DELIVERY_MS).toISOString();
  const { data, error } = await supabase
    .from('notification_deliveries')
    .update({
      status: 'cancelled',
      last_error: 'Not sent within 12 hours; cancelled as out of date',
      updated_at: nowIso(clock),
    })
    .in('status', CLAIMABLE_STATUSES)
    .lt('created_at', cutoff)
    .select('id');
  if (error) throw error;
  return data?.length || 0;
}

async function fetchQueuedBatch(supabase, priorities, excludeIds, limit) {
  const { data, error } = await supabase
    .from('notification_deliveries')
    .select('*')
    .in('status', CLAIMABLE_STATUSES)
    .in('priority', priorities)
    .order('created_at', { ascending: true })
    .limit(limit + excludeIds.size);
  if (error) throw error;
  return (data || []).filter((row) => !excludeIds.has(row.id)).slice(0, limit);
}

/**
 * Send queued email/SMS deliveries.
 *
 * - With `deliveryIds` (right after a broadcast): sends every listed row, not only the first few.
 * - Without (the scheduled job): recovers stuck rows, cancels out-of-date ones, then sends
 *   pending and retrying rows, urgent priorities first.
 *
 * Rows not started before the time budget runs out stay pending (`deferred`) for the next run.
 */
export async function processNotificationDeliveries({
  deliveryIds,
  supabase = getSupabaseAdmin(),
  senders = defaultSenders,
  clock = Date.now,
  timeBudgetMs = DEFAULT_TIME_BUDGET_MS,
} = {}) {
  if (!supabase) {
    return { processed: 0, results: [], message: 'SUPABASE_SERVICE_ROLE_KEY required' };
  }

  const deadline = clock() + timeBudgetMs;
  const results = [];
  const options = { senders, clock };

  const runBatch = async (deliveries) => {
    const batchResults = await mapWithConcurrency(deliveries, DELIVERY_CONCURRENCY, (delivery) => {
      if (clock() >= deadline) {
        return { id: delivery.id, channel: delivery.channel, status: 'pending', deferred: true };
      }
      return processDelivery(supabase, delivery, options);
    });
    results.push(...batchResults);
  };

  const summarize = (extra = {}) => {
    const attempted = results.filter((r) => !r.deferred && !r.claimedElsewhere);
    return {
      processed: attempted.length,
      deferred: results.filter((r) => r.deferred).length,
      results,
      ...extra,
    };
  };

  if (deliveryIds?.length) {
    const uniqueIds = [...new Set(deliveryIds)];
    for (let i = 0; i < uniqueIds.length; i += MAX_BATCH_SIZE) {
      const ids = uniqueIds.slice(i, i + MAX_BATCH_SIZE);
      if (clock() >= deadline) {
        results.push(...ids.map((id) => ({ id, status: 'pending', deferred: true })));
        continue;
      }
      const { data: deliveries, error } = await supabase
        .from('notification_deliveries')
        .select('*')
        .in('id', ids);
      if (error) throw error;
      await runBatch((deliveries || []).filter((d) => CLAIMABLE_STATUSES.includes(d.status)));
    }
    return summarize();
  }

  const recovered = await recoverStuckDeliveries(supabase, clock);
  const cancelled = await cancelStaleDeliveries(supabase, clock);
  const seen = new Set();

  for (const priorities of [URGENT_PRIORITIES, OTHER_PRIORITIES]) {
    while (clock() < deadline) {
      const batch = await fetchQueuedBatch(supabase, priorities, seen, MAX_BATCH_SIZE);
      if (!batch.length) break;
      batch.forEach((row) => seen.add(row.id));
      await runBatch(batch);
    }
  }

  return summarize({ recovered, cancelled });
}
