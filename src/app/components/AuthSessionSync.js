"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";

async function fetchAppProfile(session) {
  const res = await fetch("/api/auth/ensure-profile", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Profile sync failed");
  return result.profile;
}

export function AuthSessionSync() {
  const setAuth = useAuthStore.setState;

  useEffect(() => {
    let mounted = true;

    async function syncSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted || !session?.user) return;

      try {
        const profile = await fetchAppProfile(session);
        if (!mounted) return;

        setAuth({
          user: {
            id: session.user.id,
            name: profile?.full_name || "User",
            role: profile?.user_type || "tourist",
            email: profile?.email || session.user.email || "",
            phone: profile?.phone || "",
            nationality: profile?.nationality || "Filipino",
            created_at: profile?.created_at || null,
          },
          isAuthenticated: true,
        });

        if (profile?.user_type === "tourist") {
          useNotificationStore.getState().fetchNotifications(session.user.id);
        }
      } catch {
        // Session exists but profile sync failed — keep persisted state
      }
    }

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        useNotificationStore.getState().clearNotifications();
        setAuth({ user: null, isAuthenticated: false });
        return;
      }

      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        try {
          const profile = await fetchAppProfile(session);
          if (!mounted) return;
          setAuth({
            user: {
              id: session.user.id,
              name: profile?.full_name || "User",
              role: profile?.user_type || "tourist",
              email: profile?.email || session.user.email || "",
              phone: profile?.phone || "",
              nationality: profile?.nationality || "Filipino",
              created_at: profile?.created_at || null,
            },
            isAuthenticated: true,
          });

          if (profile?.user_type === "tourist") {
            useNotificationStore.getState().fetchNotifications(session.user.id);
          }
        } catch {
          // ignore
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setAuth]);

  return null;
}
