import { NextResponse } from 'next/server';
import { processNotificationDeliveries } from '@/lib/notificationQueue.server';
import { secretsMatch } from '@/lib/cronAuth';

/** Seconds this request may run while it sends queued messages (Vercel Hobby allows up to 60). */
export const maxDuration = 60;

/** Accepts the internal notification secret, or CRON_SECRET from the scheduled job. */
function requireQueueSecret(request) {
  const internalSecret = process.env.NOTIFICATION_INTERNAL_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  if (!internalSecret && !cronSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'NOTIFICATION_INTERNAL_SECRET or CRON_SECRET is not configured' },
        { status: 503 }
      ),
    };
  }
  const internalHeader = request.headers.get('x-notification-secret');
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const allowed =
    secretsMatch(internalHeader, internalSecret) ||
    secretsMatch(bearer, cronSecret) ||
    secretsMatch(request.headers.get('x-cron-secret'), cronSecret);
  if (!allowed) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true };
}

function countByStatus(results) {
  const counts = {};
  for (const r of results || []) counts[r.status] = (counts[r.status] || 0) + 1;
  return counts;
}

export async function POST(request) {
  try {
    const gate = requireQueueSecret(request);
    if (!gate.ok) return gate.response;

    const body = await request.json().catch(() => ({}));
    const deliveryIds = Array.isArray(body?.deliveryIds)
      ? body.deliveryIds.filter((id) => typeof id === 'string')
      : undefined;
    const result = await processNotificationDeliveries({ deliveryIds });
    return NextResponse.json({
      success: !result.message,
      processed: result.processed,
      deferred: result.deferred,
      recovered: result.recovered ?? 0,
      cancelled: result.cancelled ?? 0,
      byStatus: countByStatus(result.results),
      message: result.message || null,
    });
  } catch (err) {
    console.error('[ProcessQueue]', err);
    return NextResponse.json({ error: 'Failed to process notification queue' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
