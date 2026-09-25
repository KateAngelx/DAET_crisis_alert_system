import { NextResponse } from 'next/server';
import { requireTourist } from '@/lib/touristAuth';
import { API_RATE_LIMITS, enforceRateLimitByKey } from '@/lib/apiRateLimit';

const ASSIGNMENT_SELECT = `
  *,
  guide:profiles!guide_assignments_guide_id_fkey(*),
  tourist:profiles!guide_assignments_tourist_id_fkey(*),
  tour_group:tour_groups(*)
`;

export async function POST(request) {
  try {
    const auth = await requireTourist(request);
    if (auth.error) return auth.error;

    const { admin, user } = auth;

    const limited = enforceRateLimitByKey(user.id, {
      name: 'assignment-respond',
      ...API_RATE_LIMITS.assignmentRespond,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const { assignmentId, action } = body;

    if (!assignmentId || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'assignmentId and action (accept|decline) required' }, { status: 400 });
    }

    const { data: assignment, error: fetchError } = await admin
      .from('guide_assignments')
      .select(ASSIGNMENT_SELECT)
      .eq('id', assignmentId)
      .eq('tourist_id', user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: 'Assignment request not found or already handled.' }, { status: 404 });
    }

    if (action === 'accept') {
      await admin
        .from('guide_assignments')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('tourist_id', user.id)
        .eq('status', 'pending')
        .neq('id', assignmentId);

      const { data, error } = await admin
        .from('guide_assignments')
        .update({
          status: 'active',
          responded_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)
        .eq('tourist_id', user.id)
        .select(ASSIGNMENT_SELECT)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, assignment: data });
    }

    const { error } = await admin
      .from('guide_assignments')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .eq('tourist_id', user.id)
      .eq('status', 'pending');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignment });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
