"use client";

import React from "react";
import Link from "next/link";
import { Mail, MessageSquare, Bell, ArrowRight } from "lucide-react";
import { InfoOutlineCard } from "@/app/components/ui/InfoOutlineCard";
import { typography } from "@/lib/designSystem";
import { siteInfo } from "@/lib/siteInfo";

const CHANNELS = [
  {
    icon: Mail,
    label: "Email Alerts",
    description: `Official crisis updates sent to your registered email when the ${siteInfo.officeName} broadcasts an alert.`,
    accent: "blue",
  },
  {
    icon: MessageSquare,
    label: "SMS Alerts",
    description: "Urgent text messages for active emergencies — enable in your profile after registering.",
    accent: "green",
  },
  {
    icon: Bell,
    label: "App Notifications",
    description: `Real-time notices inside ${siteInfo.brandName} when you are signed in.`,
    accent: "purple",
  },
];

export function CommunicationChannelsOverview({ showRegisterCta = false, className = "" }) {
  return (
    <div className={className}>
      <div className="mb-6 sm:mb-8">
        <p className={`${typography.sectionTitle} text-blue-600 mb-2`}>Communication Channels</p>
        <h2 className={`${typography.cardTitle} mb-2`}>
          How {siteInfo.officeName} Reaches You During a Crisis
        </h2>
        <p className={`${typography.description} max-w-2xl`}>
          {siteInfo.brandName} is the official tourist crisis communication platform. When an emergency alert is
          issued, registered users may receive it through these channels.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {CHANNELS.map((channel) => (
          <InfoOutlineCard key={channel.label} {...channel} />
        ))}
      </div>

      {showRegisterCta && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-colors"
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
