import { NextResponse } from 'next/server';
import { requireAdmin, VALID_USER_ROLES } from '@/lib/adminAuth';

const PATCHABLE_FIELDS = ['user_type', 'full_name', 'phone', 'nationality', 'is_active'];

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { admin, user: caller } = auth;
    const { id: targetUserId } = await params;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await request.json();

    const { data: targetProfile, error: fetchError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updates = {};

    if (body.user_type !== undefined) {
      if (!VALID_USER_ROLES.includes(body.user_type)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be tourist, guide, or admin.' },
          { status: 400 }
        );
      }
      updates.user_type = body.user_type;
    }

    if (body.full_name !== undefined) {
      updates.full_name = String(body.full_name).trim() || targetProfile.full_name;
    }

    if (body.phone !== undefined) {
      updates.phone = body.phone ? String(body.phone).trim() : null;
    }

    if (body.nationality !== undefined) {
      updates.nationality = String(body.nationality).trim() || 'Filipino';
    }

    if (body.is_active !== undefined) {
      if (targetUserId === caller.id && body.is_active === false) {
        return NextResponse.json(
          { error: 'You cannot deactivate your own account.' },
          { status: 400 }
        );
      }
      updates.is_active = Boolean(body.is_active);
    }

    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasUpdates) {
      return NextResponse.json({ success: true, profile: targetProfile });
    }

    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', targetUserId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (updates.user_type === 'tourist') {
      await admin.from('tourist_registrations').upsert({
        user_id: targetUserId,
        destination: 'Daet, Camarines Norte',
        registration_status: 'approved',
        current_status: 'registered',
      }, { onConflict: 'user_id' });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { admin, user: caller } = auth;
    const { id: targetUserId } = await params;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (targetUserId === caller.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account from admin. Use profile settings or ask another admin.' },
        { status: 400 }
      );
    }

    const { data: targetProfile } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('id', targetUserId)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
