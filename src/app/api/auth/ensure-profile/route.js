import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const VALID_ROLES = ['tourist', 'guide', 'admin'];

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

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required' },
        { status: 500 }
      );
    }

    const meta = user.user_metadata || {};

    const { data: existing } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) {
      const { data: updated, error: updateError } = await admin
        .from('profiles')
        .update({
          full_name: meta.full_name || existing.full_name,
          phone: meta.phone ?? existing.phone,
          email: user.email,
          nationality: meta.nationality || existing.nationality,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      if (updated.user_type === 'tourist') {
        await admin.from('tourist_registrations').upsert({
          user_id: user.id,
          destination: 'Daet, Camarines Norte',
          registration_status: 'approved',
          current_status: 'registered',
        }, { onConflict: 'user_id' });
      }

      return NextResponse.json({ success: true, profile: updated });
    }
    const { data: created, error: insertError } = await admin
      .from('profiles')
      .insert({
        id: user.id,
        full_name: meta.full_name || 'User',
        phone: meta.phone || null,
        email: user.email,
        nationality: meta.nationality || 'Filipino',
        user_type: 'tourist',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (!VALID_ROLES.includes(created.user_type)) {
      return NextResponse.json({ error: 'Invalid role assigned' }, { status: 500 });
    }

    if (created.user_type === 'tourist') {
      await admin.from('tourist_registrations').upsert({
        user_id: user.id,
        destination: 'Daet, Camarines Norte',
        registration_status: 'approved',
        current_status: 'registered',
      }, { onConflict: 'user_id' });
    }

    return NextResponse.json({ success: true, profile: created });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
