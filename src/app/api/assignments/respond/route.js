import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireTourist } from '@/lib/touristAuth';

const ASSIGNMENT_SELECT = `
  *,
  guide:profiles!guide_assignments_guide_id_fkey(*),
  tourist:profiles!guide_assignments_tourist_id_fkey(*),
  tour_group:tour_groups(*)
`;

function debugLog(message, data) {
  try {
    fs.appendFileSync(
      path.join(process.cwd(), 'debug-d2282c.log'),
      JSON.stringify({ sessionId: 'd2282c', location: 'assignments/respond', message, data, timestamp: Date.now() }) + '\n'
    );
  } catch { /* ignore */ }
}

export async function POST(request) {
  try {
    const auth = await requireTourist(request);
    if (auth.error) return auth.error;

    const { admin, user } = auth;
    const body = await request.json();
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
      debugLog('Assignment not found', { assignmentId, touristId: user.id, fetchError: fetchError?.message });
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
        debugLog('Accept update failed', { assignmentId, error: error.message, code: error.code });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      debugLog('Assignment accepted', { assignmentId, touristId: user.id, runId: 'api-fix' });
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
      debugLog('Decline update failed', { assignmentId, error: error.message, code: error.code });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    debugLog('Assignment declined', { assignmentId, touristId: user.id, runId: 'api-fix' });
    return NextResponse.json({ success: true, assignment });
  } catch (err) {
    debugLog('Respond catch', { error: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
