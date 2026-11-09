"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { syncProfileFromServer, useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { clearInvalidAuthSession, fetchWithFreshSession, isInvalidRefreshError } from "@/lib/authSession";

async function sendHeartbeat() {
  await fetchWithFreshSession("/api/auth/heartbeat", {
    method: "POST",
  });
}

export function AuthSessionSync() {
  const setAuth = useAuthStore.setState;

  useEffect(() => {
    let mounted = true;
    const deferredTasks = new Set();

    function deferUntilAuthCallbackReturns(task) {
      const timer = window.setTimeout(() => {
        deferredTasks.delete(timer);
        if (mounted) task();
      }, 0);
      deferredTasks.add(timer);
    }

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

    async function syncProfile(session, event) {
      try {
        const profile = await syncProfileFromServer(session, { loginEvent: event === "SIGNED_IN" });
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
            notification_channels: profile?.notification_channels || { email: true, sms: true, app: true, push: false },
            notification_channels_configured: Boolean(profile?.notification_channels_configured),
          },
          isAuthenticated: true,
        });

        if (profile?.user_type === "tourist") {
          useNotificationStore.getState().fetchNotifications(session.user.id);
        }
      } catch (err) {
        if (isInvalidRefreshError(err)) {
          await clearInvalidAuthSession("AuthSessionSync-syncProfile");
        }
        if (mounted && event === "INITIAL_SESSION") {
          setAuth({ user: null, isAuthenticated: false });
        }
      }
    }

    const heartbeatInterval = setInterval(async () => {
      try {
        await sendHeartbeat();
      } catch {
        /* ignore heartbeat errors */
      }
    }, 5 * 60 * 1000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setAuth({ user: null, isAuthenticated: false });
        deferUntilAuthCallbackReturns(() => useNotificationStore.getState().clearNotifications());
        return;
      }

      if (event === "TOKEN_REFRESHED" && !session) {
        deferUntilAuthCallbackReturns(() => {
          void clearInvalidAuthSession("token-refreshed-without-session");
        });
        return;
      }

      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        deferUntilAuthCallbackReturns(() => {
          void syncProfile(session, event);
        });
      } else if (event === "INITIAL_SESSION" && !session) {
        setAuth({ user: null, isAuthenticated: false });
        deferUntilAuthCallbackReturns(() => useNotificationStore.getState().clearNotifications());
      }
    });

    return () => {
      mounted = false;
      deferredTasks.forEach((timer) => window.clearTimeout(timer));
      deferredTasks.clear();
      clearInterval(heartbeatInterval);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      subscription.unsubscribe();
    };
  }, [setAuth]);

  return null;
}
