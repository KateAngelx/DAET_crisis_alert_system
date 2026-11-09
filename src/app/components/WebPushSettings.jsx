"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import {
  getPushServiceRegistration,
  registerPushServiceWorker,
  subscriptionUsesKey,
  supportsWebPush,
  urlBase64ToUint8Array,
} from "@/lib/webPushClient";

export function WebPushSettings() {
  const user = useAuthStore((state) => state.user);
  const [available, setAvailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [permission, setPermission] = useState("default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const updateStoredPreference = (push) => {
    useAuthStore.setState((state) => state.user ? {
      user: {
        ...state.user,
        notification_channels: { ...state.user.notification_channels, push },
      },
    } : {});
  };

  const loadSettings = useCallback(async () => {
    const supported = supportsWebPush();
    if (!supported) {
      setAvailable(false);
      return;
    }
    setAvailable(true);
    setPermission(Notification.permission);
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Sign in again to manage browser push notifications.");
      const registration = await getPushServiceRegistration();
      const currentSubscription = await registration?.pushManager.getSubscription();
      const query = currentSubscription?.endpoint
        ? `?endpoint=${encodeURIComponent(currentSubscription.endpoint)}`
        : "";
      const response = await fetch(`/api/auth/push-subscriptions${query}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load push settings.");
      const subscriptionKeyMatches = !currentSubscription || !result.publicKey
        || subscriptionUsesKey(currentSubscription, urlBase64ToUint8Array(result.publicKey));
      setAvailable(true);
      setPermission(Notification.permission);
      setConfigured(result.configured);
      setPublicKey(result.publicKey || null);
      setEnabled(result.enabled);
      setDeviceEnabled(result.deviceEnabled === true && subscriptionKeyMatches);
      setLoaded(true);
    } catch (loadError) {
      setAvailable(true);
      setLoaded(true);
      setError(loadError.message || "Unable to load push settings.");
    }
  }, []);

  useEffect(() => {
    loadSettings();
    window.addEventListener("focus", loadSettings);
    return () => window.removeEventListener("focus", loadSettings);
  }, [loadSettings]);

  const enablePush = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!supportsWebPush()) throw new Error("This browser or connection does not support Web Push notifications.");
      if (!configured || !publicKey) {
        throw new Error("Web Push is not configured by the service administrator yet.");
      }

      let nextPermission = Notification.permission;
      if (nextPermission === "default") {
        nextPermission = await Notification.requestPermission();
      }
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        throw new Error(nextPermission === "denied"
          ? "Notifications are blocked in browser settings. Allow them for this site, then try again."
          : "Notification permission was not granted.");
      }

      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");

      const settingsResponse = await fetch("/api/auth/push-subscriptions", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const settings = await settingsResponse.json().catch(() => ({}));
      if (!settingsResponse.ok) throw new Error(settings.error || "Unable to load push settings.");
      if (!settings.configured || !settings.publicKey) {
        throw new Error("Web Push is not configured by the service administrator yet.");
      }

      const registration = await registerPushServiceWorker();
      let subscription = await registration.pushManager.getSubscription();
      const applicationServerKey = urlBase64ToUint8Array(settings.publicKey);
      let previousEndpoint = null;
      if (subscription) {
        if (!subscriptionUsesKey(subscription, applicationServerKey)) {
          previousEndpoint = subscription.endpoint;
          await subscription.unsubscribe();
          subscription = null;
        }
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
        body: JSON.stringify({
          action: "subscribe",
          subscription: subscription.toJSON(),
          previousEndpoint,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to enable push notifications.");
      setConfigured(true);
      setEnabled(true);
      setDeviceEnabled(true);
      updateStoredPreference(true);
      setMessage("Push alerts are enabled for this account and device. You can turn them off here anytime.");
    } catch (enableError) {
      setError(enableError.message || "Unable to enable push notifications.");
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/auth/push-subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "disable" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to disable push notifications.");
      setEnabled(false);
      setDeviceEnabled(false);
      try {
        if (user?.id) window.localStorage.setItem(`daet-push-prompt-dismissed:${user.id}`, "1");
      } catch {
        // Keep the Profile preference update if browser storage is unavailable.
      }
      updateStoredPreference(false);
      setMessage("Push alerts are disabled on all devices for this account.");
    } catch (disableError) {
      setError(disableError.message || "Unable to disable push notifications.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl border border-blue-200 bg-white p-2.5 text-blue-700">
          {enabled ? <BellRing size={19} /> : <BellOff size={19} />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-zinc-900">Browser and desktop push alerts</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">
            Get system notification banners on supported phones and computers, including when CONNECT-DAET is in the background.
            Push alerts use your browser or operating-system notification settings and may play its standard notification sound.
          </p>
          <p className="mt-2 text-xs font-medium text-zinc-600">
            Before enabling, your browser will ask permission to show notifications. Push is separate from the in-app notification center.
            You can change browser permission in your device settings.
            {permission === "denied" ? " Notifications are currently blocked by this browser." : ""}
          </p>
          {error ? <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-white p-2.5 text-sm font-bold text-red-800">{error}</p> : null}
          {message ? <p role="status" className="mt-3 rounded-lg border border-green-200 bg-white p-2.5 text-sm font-bold text-green-800">{message}</p> : null}
          {!available ? (
            <p className="mt-3 text-xs font-semibold text-amber-900">
              This browser or connection does not support Web Push. Use a supported browser on HTTPS; iPhone and iPad may require adding the site to the Home Screen.
            </p>
          ) : !loaded ? (
            <p className="mt-3 text-xs font-semibold text-zinc-600">Checking push setup...</p>
          ) : !configured && !error ? (
            <p className="mt-3 text-xs font-semibold text-amber-900">
              Push notifications are not configured on the server yet.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {deviceEnabled ? (
              <button type="button" onClick={disablePush} disabled={busy} className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-blue-800 disabled:opacity-50">
                {busy ? <Loader2 size={15} className="inline animate-spin" /> : <BellOff size={15} className="mr-1 inline" />}
                Turn off on all devices
              </button>
            ) : (
              <button
                type="button"
                onClick={enablePush}
                disabled={busy || !available || !loaded || !configured || permission === "denied"}
                title={!loaded
                  ? "Checking whether push alerts are configured."
                  : !configured
                  ? "Push alerts must be configured on the server first."
                  : permission === "denied"
                    ? "Allow notifications in your browser settings first."
                    : undefined}
                className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 disabled:opacity-100"
              >
                {busy ? <Loader2 size={15} className="inline animate-spin" /> : <BellRing size={15} className="mr-1 inline" />}
                Enable browser push
              </button>
            )}
            {deviceEnabled ? (
              <span className="text-xs font-bold text-green-800">Enabled on this device</span>
            ) : enabled ? (
              <span className="text-xs font-bold text-zinc-600">Enabled on another device</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
