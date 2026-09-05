import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Project → Settings → Environment Variables, then redeploy.';

let client = null;

function getClient() {
  if (!isSupabaseConfigured) {
    throw new Error(supabaseConfigError);
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

/** Lazy Supabase client — avoids Headers error when env vars are missing on Vercel. */
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getClient();
      const value = instance[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  }
);
