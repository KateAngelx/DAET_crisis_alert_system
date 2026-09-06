"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/app/store/crisisStore";
import { CommunicationChannelOnboarding } from "@/app/components/CommunicationChannelSetup";

const SESSION_PROMPT_KEY = "connect_daet_channel_prefs_prompted";

/** Prompt tourists/guides once per account until preferences are saved or skipped */
export function ChannelPreferencesGate() {
  const { user, isAuthenticated } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || !isAuthenticated || !user) return null;
  if (user.role === "admin") return null;
  if (user.notification_channels_configured) return null;

  // Avoid re-showing in the same browser session after skip/save until auth state refreshes
  if (typeof window !== "undefined") {
    const dismissedForUser = sessionStorage.getItem(`${SESSION_PROMPT_KEY}:${user.id}`);
    if (dismissedForUser === "1") return null;
  }

  return (
    <CommunicationChannelOnboarding
      onComplete={() => {
        if (typeof window !== "undefined" && user?.id) {
          sessionStorage.setItem(`${SESSION_PROMPT_KEY}:${user.id}`, "1");
        }
      }}
    />
  );
}
