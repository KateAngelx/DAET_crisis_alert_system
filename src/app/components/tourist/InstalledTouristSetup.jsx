"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BellRing, Loader2 } from "lucide-react";
import { CommunicationChannelOnboarding } from "@/app/components/CommunicationChannelSetup";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { useInstalledApp } from "@/lib/useInstalledApp";
import {
  getPushServiceRegistration,
  reconcileAccountPushSubscription,
  registerPushServiceWorker,
  subscriptionUsesKey,
  supportsWebPush,
  urlBase64ToUint8Array,
} from "@/lib/webPushClient";

function dismissalKey(userId) {
  return `daet-push-prompt-dismissed:${userId}`;
}

function InstalledPushStep({ userId }) {
  const [phase, setPhase] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (window.localStorage.getItem(dismissalKey(userId)) === "1" || !supportsWebPush()) {
          if (active) setPhase("hidden");
          return;
        }
        const session = await getActiveSession();
        if (!session?.access_token) {
          if (active) setPhase("hidden");
          return;
        }
        const registration = await getPushServiceRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) await reconcileAccountPushSubscription(session.access_token);
        const query = subscription?.endpoint ? `?endpoint=${encodeURIComponent(subscription.endpoint)}` : "";
        const response = await fetch(`/api/auth/push-subscriptions${query}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await response.json().catch(() => ({}));
        if (!active || !response.ok || !result.configured || Notification.permission === "denied") {
          if (active) setPhase("hidden");
          return;
        }
        const matches = !subscription || !result.publicKey
          || subscriptionUsesKey(subscription, urlBase64ToUint8Array(result.publicKey));
        if (active) setPhase(subscription && result.deviceEnabled && matches ? "hidden" : "ask");
      } catch {
        if (active) setPhase("hidden");
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(dismissalKey(userId), "1");
    } catch {
      // Keep the step closed for this visit when storage is blocked.
    }
    setPhase("hidden");
  };

  const allow = async () => {
    setBusy(true);
    setError("");
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Sign in again to allow alerts on this phone.");
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== "granted") {
        throw new Error("Alerts stay off until you allow them. You can change this later in Profile.");
      }
      const settingsResponse = await fetch("/api/auth/push-subscriptions", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const settings = await settingsResponse.json().catch(() => ({}));
      if (!settingsResponse.ok || !settings.configured || !settings.publicKey) {
        throw new Error("Phone alerts are not available yet. You can turn them on later in Profile.");
      }
      const registration = await registerPushServiceWorker();
      const applicationServerKey = urlBase64ToUint8Array(settings.publicKey);
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !subscriptionUsesKey(subscription, applicationServerKey)) {
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }
      const response = await fetch("/api/auth/push-subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "subscribe", subscription: subscription.toJSON() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to turn on phone alerts.");
      useAuthStore.setState((state) => state.user ? {
        user: {
          ...state.user,
          notification_channels: { ...state.user.notification_channels, push: true },
        },
      } : {});
      setPhase("hidden");
    } catch (allowError) {
      setError(allowError.message || "Unable to turn on phone alerts.");
    } finally {
      setBusy(false);
    }
  };

  if (phase !== "ask") return null;

  return (
    <div className="fixed inset-0 z-[2300] flex items-end justify-center bg-zinc-950/70 p-3 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="installed-push-title" className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
            <BellRing size={18} />
          </span>
          <div>
            <h2 id="installed-push-title" className="text-lg font-black text-zinc-900">Alerts on this phone</h2>
            <p className="mt-1 text-sm font-medium text-zinc-600">
              Allow alerts for crisis messages on this phone. You can change this later in Profile.
            </p>
          </div>
        </div>
        {error ? (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="min-h-11 flex-1 rounded-xl border border-zinc-200 text-xs font-black uppercase tracking-widest text-zinc-600"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={allow}
            disabled={busy}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : null}
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}

export function InstalledTouristSetup() {
  const pathname = usePathname();
  const installed = useInstalledApp();
  const { user, isAuthenticated } = useAuthStore();
  const [guide, setGuide] = useState(null);

  const onAuthScreen = pathname === "/login"
    || pathname === "/register"
    || pathname.startsWith("/forgot-password")
    || pathname.startsWith("/reset-password");

  useEffect(() => {
    const onGuide = (event) => {
      if (event.detail?.settled) setGuide(Boolean(event.detail.open));
    };
    window.addEventListener("daet:start-guide", onGuide);
    return () => window.removeEventListener("daet:start-guide", onGuide);
  }, []);

  if (!installed || onAuthScreen || !isAuthenticated || user?.role !== "tourist" || !user?.id) return null;
  if (guide === null || guide) return null;
  if (!user.notification_channels_configured) {
    return <CommunicationChannelOnboarding compact onComplete={() => {}} />;
  }
  return <InstalledPushStep userId={user.id} />;
}
