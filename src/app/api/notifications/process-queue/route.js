import { NextResponse } from 'next/server';
import { processNotificationDeliveries } from '@/lib/notificationQueue.server';

export async function POST(request) {
  try {
    const secret = process.env.NOTIFICATION_INTERNAL_SECRET;
    if (secret) {
      const header = request.headers.get('x-notification-secret');
      if (header !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

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
