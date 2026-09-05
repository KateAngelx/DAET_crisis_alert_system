import { NextResponse } from 'next/server';
import { requireAdmin, VALID_USER_ROLES } from '@/lib/adminAuth';

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { admin } = auth;
    const { id: targetUserId } = await params;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { user_type: newRole } = body;

    if (!newRole || !VALID_USER_ROLES.includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be tourist, guide, or admin.' },
        { status: 400 }
      );
    }

    const { data: targetProfile, error: fetchError } = await admin
      .from('profiles')
      .select('id, user_type, full_name, email')
      .eq('id', targetUserId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetProfile.user_type === newRole) {
      return NextResponse.json({ success: true, profile: targetProfile });
    }

    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update({ user_type: newRole })
      .eq('id', targetUserId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
