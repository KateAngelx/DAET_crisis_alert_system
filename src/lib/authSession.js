import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/app/store/crisisStore';
import { useNotificationStore } from '@/app/store/notificationStore';

const INVALID_REFRESH_PATTERNS = [
  'refresh token not found',
  'invalid refresh token',
  'refresh token already used',
  'session not found',
];

export function isInvalidRefreshError(error) {
  if (!error) return false;
  const message = String(error.message || error).toLowerCase();
  return INVALID_REFRESH_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function clearInvalidAuthSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore sign-out errors when tokens are already invalid */
  }

  useAuthStore.setState({ user: null, isAuthenticated: false, loading: false });
  useNotificationStore.getState().clearNotifications();
}

/** Wait until zustand persist has restored auth state from localStorage. */
export function waitForAuthHydration() {
  return new Promise((resolve) => {
    if (useAuthStore.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

/**
 * Returns the active Supabase session, or null.
 * Clears stale local auth when Supabase refresh token is missing/invalid.
 */
export async function getActiveSession() {
  await waitForAuthHydration();

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      if (isInvalidRefreshError(error)) {
        await clearInvalidAuthSession();
      }
      return null;
    }

    return session;
  } catch (err) {
    if (isInvalidRefreshError(err)) {
      await clearInvalidAuthSession();
    }
    return null;
  }
}
