import { NextResponse } from 'next/server';
import { processNotificationDeliveries } from '@/lib/notificationQueue.server';

function requireQueueSecret(request) {
  const secret = process.env.NOTIFICATION_INTERNAL_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'NOTIFICATION_INTERNAL_SECRET is not configured' },
        { status: 503 }
      ),
    };
  }
  const header = request.headers.get('x-notification-secret');
  if (header !== secret) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true };
}

export async function POST(request) {
  try {
    const gate = requireQueueSecret(request);
    if (!gate.ok) return gate.response;

    const body = await request.json().catch(() => ({}));
    const result = await processNotificationDeliveries({ deliveryIds: body.deliveryIds });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[ProcessQueue]', err);
    return NextResponse.json({ error: 'Failed to process notification queue' }, { status: 500 });
  }
}

export async function GET(request) {
  return POST(request);
}
