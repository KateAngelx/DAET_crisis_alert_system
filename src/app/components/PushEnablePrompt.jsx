"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, X } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { portalShell } from "@/lib/designSystem";
import {
  getPushServiceRegistration,
  reconcileAccountPushSubscription,
  subscriptionUsesKey,
  supportsWebPush,
  urlBase64ToUint8Array,
} from "@/lib/webPushClient";

function dismissalKey(userId) {
  return `daet-push-prompt-dismissed:${userId}`;
}

export function PushEnablePrompt() {
  const { isAuthenticated, user } = useAuthStore();
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !supportsWebPush()) return undefined;

    let active = true;
    const key = dismissalKey(user.id);
    const checkSettings = async () => {
      try {
        if (window.localStorage.getItem(key) === "1") {
          if (active) setPrompt(null);
          return;
        }

        const session = await getActiveSession();
        if (!session?.access_token) return;
        const registration = await getPushServiceRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) await reconcileAccountPushSubscription(session.access_token);
        const query = subscription?.endpoint ? `?endpoint=${encodeURIComponent(subscription.endpoint)}` : "";
        const response = await fetch(`/api/auth/push-subscriptions${query}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) return;

        const subscriptionMatches = !subscription || !result.publicKey
          || subscriptionUsesKey(subscription, urlBase64ToUint8Array(result.publicKey));
        const deviceEnabled = Boolean(subscription && result.deviceEnabled && subscriptionMatches);
        const registeredElsewhere = Math.max(
          0,
          (Number(result.enabledDeviceCount) || 0) - (result.deviceEnabled === true ? 1 : 0)
        );
        if (active) {
          setPrompt(
            result.configured && !deviceEnabled && Notification.permission !== "denied"
              ? { userId: user.id, otherDevices: registeredElsewhere }
              : null
          );
        }
      } catch {
        if (active) setPrompt(null);
      }
    };

    checkSettings();
    window.addEventListener("focus", checkSettings);
    return () => {
      active = false;
      window.removeEventListener("focus", checkSettings);
    };
  }, [isAuthenticated, user?.id]);

  const dismiss = () => {
    try {
      if (user?.id) window.localStorage.setItem(dismissalKey(user.id), "1");
    } catch {
      // Dismiss for this render if browser storage is unavailable.
    }
    setPrompt(null);
  };

  if (!isAuthenticated || !user?.id || !supportsWebPush() || prompt?.userId !== user.id) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-70 mx-auto w-auto max-w-md rounded-xl border border-blue-200 bg-white p-4 shadow-xl sm:inset-x-auto sm:right-5 sm:w-[min(100%-2.5rem,26rem)]"
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-lg bg-blue-50 p-2 text-blue-700">
          <BellRing size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-zinc-900">Enable push alerts on this device?</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            {prompt.otherDevices > 0
              ? `This device is off. This account already receives push on ${prompt.otherDevices} other device${prompt.otherDevices === 1 ? "" : "s"}. Enable this device in Profile to receive the same alerts here.`
              : "Get supported system banners for CONNECT-DAET alerts. You can manage this any time in Profile."}
          </p>
          <Link
            href="/profile"
            onClick={dismiss}
            className={`${portalShell.btnPrimary} mt-3 min-h-10`}
          >
            Manage in Profile <ArrowRight size={14} />
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Dismiss push notification prompt"
          title="Dismiss"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </aside>
  );
}