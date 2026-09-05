"use client";

import { useAuthStore } from "@/app/store/crisisStore";
import { CommunicationChannelOnboarding } from "@/app/components/CommunicationChannelSetup";

/** Prompt tourists/guides to choose notification channels on first login */
export function ChannelPreferencesGate() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) return null;
  if (user.role === "admin") return null;
  if (user.notification_channels_configured) return null;

  return <CommunicationChannelOnboarding />;
}
