"use client";

import React from "react";
import { Mail, MessageSquare, Smartphone } from "lucide-react";

const OPTIONS = [
  { key: "email", label: "Email", Icon: Mail },
  { key: "sms", label: "SMS", Icon: MessageSquare },
  { key: "app", label: "App", Icon: Smartphone },
];

export function BroadcastChannelToggles({ channels, onChange }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase text-zinc-400">Broadcast channels</p>
      <div className="flex gap-2">
        {OPTIONS.map(({ key, label, Icon }) => {
          const on = Boolean(channels?.[key]);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ ...channels, [key]: !on })}
              className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                on
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-zinc-50 text-zinc-400 border-zinc-200"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Only the channels left on are sent. SMS still follows each person’s SMS setting and phone number.
      </p>
    </div>
  );
}
