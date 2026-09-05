import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const VALID_USER_ROLES = ['tourist', 'guide', 'admin'];

export async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      error: NextResponse.json(
        { error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required' },
        { status: 500 }
      ),
    };
  }

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single();

  if (callerProfile?.user_type !== 'admin') {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  return { admin, user, callerProfile };
}
