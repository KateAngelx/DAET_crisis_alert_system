"use client";

import React, { useEffect, useState } from "react";
import { Mail, MessageSquare, Smartphone, Bell, Loader2, Info } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { useAuthStore } from "@/app/store/crisisStore";

const CHANNEL_OPTIONS = [
  {
    key: "email",
    label: "Email",
    description: "Official crisis alerts are always sent to your registered email. This toggle controls other LGU email updates.",
    icon: Mail,
  },
  {
    key: "sms",
    label: "SMS",
    description: "Get text messages for emergencies (requires valid PH mobile number).",
    icon: MessageSquare,
  },
  {
    key: "app",
    label: "In-App",
    description: "Show notifications inside CONNECT-DAET when you are signed in.",
    icon: Smartphone,
  },
];

export function CommunicationChannelForm({
  initialChannels,
  onSave,
  onSkip,
  saving = false,
  submitLabel = "Save Preferences",
  showSkip = false,
  showProfileHint = false,
}) {
  const [channels, setChannels] = useState(initialChannels);
  const [error, setError] = useState(null);

  useEffect(() => {
    setChannels(initialChannels);
  }, [initialChannels]);

  const toggle = (key) => {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!channels.email && !channels.sms && !channels.app) {
      setError("Enable at least one communication channel.");
      return;
    }
    await onSave(channels);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showProfileHint && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-sm text-blue-900 font-medium">
          <Info className="shrink-0 mt-0.5 opacity-80" size={18} />
          <p>
            Choose how Daet LGU can reach you for crisis alerts and important updates.
            You can change these anytime under <strong>Profile → Communication Preferences</strong>.
          </p>
        </div>
      )}

      {!showProfileHint && (
        <p className="text-sm text-zinc-600 font-medium">
          Choose how Daet LGU can reach you for crisis alerts and important updates.
          You can change this anytime in your profile.
        </p>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        {CHANNEL_OPTIONS.map(({ key, label, description, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
              channels[key]
                ? "bg-blue-50 border-blue-200 ring-1 ring-blue-100"
                : "bg-zinc-50 border-zinc-100 opacity-70"
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${channels[key] ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-500"}`}>
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm uppercase tracking-wide text-zinc-900">{label}</p>
              <p className="text-xs text-zinc-500 mt-1 font-medium">{description}</p>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 mt-1 ${channels[key] ? "text-blue-600" : "text-zinc-400"}`}>
              {channels[key] ? "On" : "Off"}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : submitLabel}
        </button>
        {showSkip && onSkip && (
          <button
            type="button"
            disabled={saving}
            onClick={onSkip}
            className="py-4 px-6 rounded-2xl border border-zinc-200 text-zinc-600 font-black uppercase text-xs tracking-widest hover:bg-zinc-50 disabled:opacity-50"
          >
            Skip for now
          </button>
        )}
      </div>
    </form>
  );
}

export function CommunicationChannelOnboarding({ onComplete }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const updateNotificationChannels = useAuthStore((s) => s.updateNotificationChannels);
  const skipNotificationChannelSetup = useAuthStore((s) => s.skipNotificationChannelSetup);

  const finish = () => {
    onComplete?.();
  };

  const handleSave = async (channels) => {
    setSaving(true);
    setError(null);
    try {
      const result = await updateNotificationChannels(channels, true);
      if (!result.success) {
        throw new Error(result.error || "Failed to save preferences");
      }
      finish();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await skipNotificationChannelSetup();
      if (!result.success) {
        throw new Error(result.error || "Failed to skip setup");
      }
      finish();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-6 sm:p-8 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-600 text-white rounded-2xl">
            <Bell size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">First-time setup</p>
            <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900">Communication Channels</h2>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <CommunicationChannelForm
          initialChannels={{ email: true, sms: true, app: true }}
          onSave={handleSave}
          onSkip={handleSkip}
          saving={saving}
          submitLabel="Save & Continue"
          showSkip
          showProfileHint
        />
      </Card>
    </div>
  );
}
