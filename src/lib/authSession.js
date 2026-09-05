import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/app/store/crisisStore';

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

/** Returns the active Supabase session after persist hydration, or null. */
export async function getActiveSession() {
  await waitForAuthHydration();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
