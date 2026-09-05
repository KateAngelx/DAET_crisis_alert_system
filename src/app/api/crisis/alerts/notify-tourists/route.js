import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { broadcastCrisisAlertToTourists } from '@/lib/crisisAlertBroadcast.server';

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const alertId = body.alertId;

    if (!alertId) {
      return NextResponse.json({ error: 'alertId is required' }, { status: 400 });
    }

    const results = await broadcastCrisisAlertToTourists(auth.admin, alertId);

    if (results.errors.length && results.notified === 0) {
      return NextResponse.json({ error: results.errors.join('; ') }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      notified: results.notified,
      skipped: results.skipped,
      emailQueued: results.emailQueued,
      smsQueued: results.smsQueued,
      deliveryResults: results.deliveryResults || [],
      warnings: results.errors,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to notify tourists' }, { status: 500 });
  }
}
