import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Project → Settings → Environment Variables, then redeploy.';

const CLIENT_KEY = "__connectDaetSupabase";

function isStaleRefreshTokenError(value) {
  const message = String(value?.message || value || "").toLowerCase();
  return message.includes("invalid refresh token")
    || message.includes("refresh token not found")
    || message.includes("refresh token already used");
}

function quietStaleRefreshTokenLogs() {
  if (typeof window === "undefined" || window.__connectDaetQuietAuth) return;
  window.__connectDaetQuietAuth = true;
  const reportError = console.error.bind(console);
  console.error = (...args) => {
    if (args.some((arg) => isStaleRefreshTokenError(arg))) return;
    reportError(...args);
  };
}

function getClient() {
  if (!isSupabaseConfigured) {
    throw new Error(supabaseConfigError);
  }

  const existing = globalThis[CLIENT_KEY];
  if (existing) return existing;

  quietStaleRefreshTokenLogs();
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  globalThis[CLIENT_KEY] = client;
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
