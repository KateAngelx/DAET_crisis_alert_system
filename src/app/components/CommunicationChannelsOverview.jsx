"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Mail, MessageSquare, Bell, ArrowRight } from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { typography, iconSize, statGrid, statCard, getStatCardAccent } from "@/lib/designSystem";

const CHANNELS = [
  {
    icon: Mail,
    label: "Email Alerts",
    short: "Email",
    description: "Official crisis updates sent to your registered email when LGU broadcasts an alert.",
    accent: "blue",
  },
  {
    icon: MessageSquare,
    label: "SMS Alerts",
    short: "SMS",
    description: "Urgent text messages for active emergencies — enable in your profile after registering.",
    accent: "green",
  },
  {
    icon: Bell,
    label: "App Notifications",
    short: "In-App",
    description: "Real-time notices inside CONNECT-DAET when you are signed in.",
    accent: "purple",
  },
];

export function CommunicationChannelsOverview({ showRegisterCta = false, className = "" }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ee1adc" },
      body: JSON.stringify({
        sessionId: "ee1adc",
        runId: "comm-channels-home",
        hypothesisId: "H1",
        location: "CommunicationChannelsOverview.jsx:mount",
        message: "Communication channels section rendered",
        data: { innerWidth: window.innerWidth, channelCount: CHANNELS.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  return (
    <div className={className}>
      <div className="mb-4 sm:mb-5">
        <p className={`${typography.sectionTitle} text-blue-600 mb-2`}>Communication Channels</p>
        <h2 className={`${typography.cardTitle} mb-2`}>
          How Daet LGU Reaches You During a Crisis
        </h2>
        <p className={`${typography.description} max-w-2xl`}>
          CONNECT-DAET is the official tourist crisis communication system. When an emergency alert is
          issued, registered users may receive it through these channels.
        </p>
      </div>

      <div className={statGrid.crisisHub}>
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const styles = getStatCardAccent(channel.accent);
          return (
            <OutlinedCard key={channel.label} accent={channel.accent} compact className="h-full">
              <div className={`${statCard.iconWrap} ${styles.icon} mb-2`}>
                <Icon size={iconSize.stat} />
              </div>
              <p className={`${statCard.label} ${styles.label} mb-1`}>{channel.label}</p>
              <p className="text-[10px] sm:text-xs text-zinc-500 font-medium leading-snug line-clamp-3 hidden sm:block">
                {channel.description}
              </p>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide sm:hidden">
                When issued
              </p>
            </OutlinedCard>
          );
        })}
      </div>

      {showRegisterCta && (
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-colors"
          >
            Register for Alerts <ArrowRight size={14} />
          </Link>
          <p className="text-xs text-zinc-500 font-medium">
            Choose your channels in Profile after signing up.
          </p>
        </div>
      )}
    </div>
  );
}
