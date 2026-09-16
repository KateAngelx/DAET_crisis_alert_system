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

    const reachCount =
      (results.notified || 0) + (results.emailQueued || 0) + (results.smsQueued || 0);

    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ee1adc' },
      body: JSON.stringify({
        sessionId: 'ee1adc',
        location: 'api/crisis/alerts/notify-tourists/route.js:POST',
        message: 'Broadcast notify-tourists result',
        data: {
          alertId,
          notified: results.notified,
          emailQueued: results.emailQueued,
          smsQueued: results.smsQueued,
          skipped: results.skipped,
          errorCount: results.errors?.length || 0,
          firstError: results.errors?.[0] || null,
          reachCount,
        },
        timestamp: Date.now(),
        runId: 'notify-tourists',
        hypothesisId: 'broadcast-500',
      }),
    }).catch(() => {});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ee1adc' },
      body: JSON.stringify({
        sessionId: 'ee1adc',
        location: 'api/crisis/alerts/notify-tourists/route.js:catch',
        message: 'Broadcast notify-tourists exception',
        data: { error: err.message },
        timestamp: Date.now(),
        runId: 'notify-tourists',
        hypothesisId: 'broadcast-500',
      }),
    }).catch(() => {});
    // #endregion

    return NextResponse.json(
      { error: err.message || 'Failed to notify tourists' },
      { status: 500 }
    );
  }
}
