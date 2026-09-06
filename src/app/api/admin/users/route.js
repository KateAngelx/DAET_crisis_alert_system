import { NextResponse } from 'next/server';
import { requireAdmin, VALID_USER_ROLES } from '@/lib/adminAuth';

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { admin } = auth;

    const { data, error } = await admin
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { admin } = auth;
    const body = await request.json();
    const {
      email,
      password,
      full_name,
      phone,
      nationality = 'Filipino',
      user_type = 'tourist',
    } = body;

    if (!email?.trim() || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'Email and password (min 6 characters) are required.' },
        { status: 400 }
      );
    }

    if (!VALID_USER_ROLES.includes(user_type)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    const { data: authData, error: createError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name?.trim() || 'User',
        phone: phone?.trim() || null,
        nationality,
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const userId = authData.user.id;
    const now = new Date().toISOString();

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: full_name?.trim() || 'User',
        phone: phone?.trim() || null,
        nationality,
        user_type,
        is_active: true,
        last_login_at: null,
        last_seen_at: null,
        created_at: now,
      })
      .select('*')
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (user_type === 'tourist') {
      await admin.from('tourist_registrations').upsert({
        user_id: userId,
        destination: 'Daet, Camarines Norte',
        registration_status: 'approved',
        current_status: 'registered',
      }, { onConflict: 'user_id' });
    }

    return NextResponse.json({ success: true, profile });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
