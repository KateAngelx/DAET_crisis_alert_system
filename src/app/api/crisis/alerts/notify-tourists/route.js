import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { broadcastCrisisAlertToTourists } from '@/lib/crisisAlertBroadcast.server';
import { API_RATE_LIMITS, enforceRateLimitByKey } from '@/lib/apiRateLimit';

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: 'admin-broadcast',
      ...API_RATE_LIMITS.adminBroadcast,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid JSON object is required" }, { status: 400 });
    }
    const alertId = body.alertId;
    const eventType = body.eventType || 'created';

    if (
      typeof alertId !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(alertId)
      || !['created', 'updated', 'resolved'].includes(eventType)
    ) {
      return NextResponse.json({ error: 'alertId and a valid eventType are required' }, { status: 400 });
    }

    const results = await broadcastCrisisAlertToTourists(auth.admin, alertId, eventType);

    if (results.rejected) {
      return NextResponse.json(
        { error: results.errors[0] || 'This notice does not match the alert status.' },
        { status: 400 }
      );
    }

    const reachCount =
      (results.notified || 0) + (results.emailQueued || 0) + (results.smsQueued || 0);

    if (results.errors.length && reachCount === 0) {
      return NextResponse.json(
        {
          error: results.errors.join('; '),
          details: results.errors,
          notified: results.notified,
          emailQueued: results.emailQueued,
          smsQueued: results.smsQueued,
          skipped: results.skipped,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notified: results.notified,
      skipped: results.skipped,
      emailQueued: results.emailQueued,
      smsQueued: results.smsQueued,
      smsDiagnostics: results.smsDiagnostics,
      smsPerRecipient: results.smsPerRecipient || [],
      deliveryResults: results.deliveryResults || [],
      warnings: results.errors,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to notify tourists' },
      { status: 500 }
    );
  }
}
