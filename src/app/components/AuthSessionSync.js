"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { clearInvalidAuthSession, getActiveSession, isInvalidRefreshError } from "@/lib/authSession";

async function fetchAppProfile(session, { loginEvent = false } = {}) {
  const res = await fetch("/api/auth/ensure-profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ loginEvent }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Profile sync failed");
  return result.profile;
}

async function sendHeartbeat(session) {
  await fetch("/api/auth/heartbeat", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  }).catch(() => {});
}

export function AuthSessionSync() {
  const setAuth = useAuthStore.setState;

  useEffect(() => {
    let mounted = true;

    function handleUnhandledRejection(event) {
      if (isInvalidRefreshError(event.reason)) {
        event.preventDefault();
        clearInvalidAuthSession("unhandled-rejection");
        if (mounted) {
          setAuth({ user: null, isAuthenticated: false });
        }
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    async function syncSession() {
      try {
        const session = await getActiveSession();
        if (!mounted) return;

        if (!session?.user) {
          setAuth({ user: null, isAuthenticated: false });
          return;
        }

        const profile = await fetchAppProfile(session, { loginEvent: true });
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
            notification_channels: profile?.notification_channels || { email: true, sms: true, app: true },
            notification_channels_configured: Boolean(profile?.notification_channels_configured),
          },
          isAuthenticated: true,
        });

        if (profile?.user_type === "tourist") {
          useNotificationStore.getState().fetchNotifications(session.user.id);
        }
      } catch (err) {
        if (isInvalidRefreshError(err)) {
          await clearInvalidAuthSession("AuthSessionSync-syncSession");
        }
        if (mounted) {
          setAuth({ user: null, isAuthenticated: false });
        }
      }
    }

    syncSession();

    const heartbeatInterval = setInterval(async () => {
      try {
        const session = await getActiveSession();
        if (session?.access_token) {
          await sendHeartbeat(session);
        }
      } catch {
        /* ignore heartbeat errors */
      }
    }, 5 * 60 * 1000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        useNotificationStore.getState().clearNotifications();
        setAuth({ user: null, isAuthenticated: false });
        return;
      }

      if (event === "TOKEN_REFRESHED" && !session) {
        await clearInvalidAuthSession("token-refreshed-without-session");
        return;
      }

      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        try {
          const profile = await fetchAppProfile(session, { loginEvent: event === "SIGNED_IN" });
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
              notification_channels: profile?.notification_channels || { email: true, sms: true, app: true },
              notification_channels_configured: Boolean(profile?.notification_channels_configured),
            },
            isAuthenticated: true,
          });

          if (profile?.user_type === "tourist") {
            useNotificationStore.getState().fetchNotifications(session.user.id);
          }
        } catch {
          /* ignore profile sync errors */
        }
      } else if (event === "INITIAL_SESSION" && !session) {
        setAuth({ user: null, isAuthenticated: false });
      }
    });

    return () => {
      mounted = false;
      clearInterval(heartbeatInterval);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      subscription.unsubscribe();
    };
  }, [setAuth]);

  return null;
}
