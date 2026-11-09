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

/** Retry an authenticated request once with a refreshed token if the API rejects the current one. */
export async function fetchWithFreshSession(url, options = {}) {
  const session = await getActiveSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const send = (accessToken) => {
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(url, { ...options, headers });
  };

  const response = await send(session.access_token);
  if (response.status !== 401) return response;

  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (
      error ||
      !data.session?.access_token ||
      data.session.user?.id !== session.user.id
    ) {
      if (isInvalidRefreshError(error)) await clearInvalidAuthSession();
      return response;
    }
    return await send(data.session.access_token);
  } catch (error) {
    if (isInvalidRefreshError(error)) await clearInvalidAuthSession();
    return response;
  }
}
