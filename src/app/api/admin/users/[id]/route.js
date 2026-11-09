import { NextResponse } from 'next/server';
import { requireAdmin, VALID_USER_ROLES } from '@/lib/adminAuth';

function missingRelation(error) {
  const message = error?.message || "";
  return /does not exist|schema cache|Could not find the/i.test(message);
}

async function clearReference(admin, table, column, userId) {
  const { error } = await admin.from(table).update({ [column]: null }).eq(column, userId);
  if (error && !missingRelation(error)) throw error;
}

async function deleteWhere(admin, table, column, value) {
  const { error } = await admin.from(table).delete().eq(column, value);
  if (error && !missingRelation(error)) throw error;
}

async function deleteWhereIn(admin, table, column, values) {
  if (!values.length) return;
  const { error } = await admin.from(table).delete().in(column, values);
  if (error && !missingRelation(error)) throw error;
}

async function removeIncidentFiles(admin, userId) {
  const bucket = admin.storage.from("incident-attachments");
  const { data: entries, error } = await bucket.list(userId, { limit: 1000 });
  if (error || !entries?.length) return;

  const paths = [];
  for (const entry of entries) {
    const folder = `${userId}/${entry.name}`;
    const { data: files } = await bucket.list(folder, { limit: 1000 });
    const filePaths = (files || [])
      .filter((file) => file.id)
      .map((file) => `${folder}/${file.name}`);
    if (filePaths.length) paths.push(...filePaths);
    else if (entry.id) paths.push(folder);
  }

  if (!paths.length) return;
  const { error: removeError } = await bucket.remove(paths);
  if (removeError && !missingRelation(removeError)) throw removeError;
}

async function releaseUserForDeletion(admin, userId) {
  await removeIncidentFiles(admin, userId);
  await deleteWhere(admin, "point_transactions", "user_id", userId);
  await clearReference(admin, "guide_assignments", "assigned_by", userId);
  await clearReference(admin, "incident_reports", "assigned_to", userId);
  await clearReference(admin, "incident_history", "changed_by", userId);

  const { data: reports, error: reportsError } = await admin
    .from("incident_reports")
    .select("id")
    .eq("reporter_id", userId);
  if (reportsError && !missingRelation(reportsError)) throw reportsError;
  const reportIds = (reports || []).map((report) => report.id);

  await deleteWhereIn(admin, "point_transactions", "incident_report_id", reportIds);
  await deleteWhereIn(admin, "incident_report_reward_decisions", "incident_report_id", reportIds);
  await deleteWhereIn(admin, "incident_reports", "id", reportIds);
  await deleteWhere(admin, "incident_report_reward_decisions", "decided_by", userId);
  await deleteWhere(admin, "incident_report_reward_decisions", "awarded_by", userId);

  const { data: emergencies, error: emergencyError } = await admin
    .from("guide_emergency_reports")
    .select("id")
    .eq("reporter_id", userId);
  if (emergencyError && !missingRelation(emergencyError)) throw emergencyError;
  const emergencyIds = (emergencies || []).map((report) => report.id);
  await deleteWhereIn(admin, "guide_emergency_report_history", "report_id", emergencyIds);
  await deleteWhereIn(admin, "guide_emergency_reports", "id", emergencyIds);
}

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

    try {
      await releaseUserForDeletion(admin, targetUserId);
    } catch (releaseError) {
      return NextResponse.json(
        { error: releaseError.message || "Linked records could not be cleared before deleting this user." },
        { status: 500 }
      );
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      const message = deleteError.message === "Database error deleting user"
        ? "This user is still linked to records that could not be removed."
        : deleteError.message;
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
