import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dispatchNotificationServer } from '@/lib/notificationDispatch.server';
import { assertDispatchAuthorized } from '@/lib/notificationDispatchAuth.server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { API_RATE_LIMITS, enforceRateLimitByKey } from '@/lib/apiRateLimit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const limited = enforceRateLimitByKey(user.id, {
      name: 'dispatch',
      ...API_RATE_LIMITS.dispatch,
    });
    if (limited) return limited;

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      userId,
      title,
      message,
      notificationType,
      priority,
      relatedType,
      relatedId,
      channels,
      recipientEmail,
      recipientPhone,
    } = body;

    if (!userId || !title || !message || !notificationType) {
      return NextResponse.json(
        { error: 'userId, title, message, and notificationType are required' },
        { status: 400 }
      );
    }

    const authz = await assertDispatchAuthorized(admin, user, {
      userId,
      notificationType,
      relatedType,
      relatedId,
    });

    if (!authz.allowed) {
      return NextResponse.json({ error: authz.reason || 'Forbidden' }, { status: 403 });
    }

    const results = await dispatchNotificationServer({
      userId,
      title,
      message,
      notificationType,
      priority,
      relatedType,
      relatedId,
      channels,
      recipientEmail,
      recipientPhone,
    });

    if (results.errors.length && !results.web) {
      return NextResponse.json({ error: results.errors.join('; ') }, { status: 500 });
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
