"use client";

import React, { useCallback, useEffect, useState } from "react";
import { SettingsPanelSkeleton } from "@/app/components/ui/Skeletons";
import {
  Users, FileText, Download, Bell, Loader2, CheckCircle, AlertCircle, Mail, MessageSquare, Map, Route,
  Coins, Gift, Compass, BookOpen, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { EscalationSettingsPanel } from "@/app/components/admin/EscalationSettingsPanel";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { adminShell } from "@/lib/designSystem";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { AUDIENCE_ROLE_OPTIONS } from "@/lib/notificationAudience";
import { getActiveSession } from "@/lib/authSession";

async function authFetch(url, options = {}) {
  const session = await getActiveSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

const REWARD_ROWS = [
  { key: "registration_points_enabled", valueKey: "registration_points_value", label: "New account", description: "Once, when a tourist registers.", icon: Coins },
  { key: "profile_completion_points_enabled", valueKey: "profile_completion_points_value", label: "Complete profile", description: "Once, when all profile fields are filled in.", icon: Users },
  { key: "alert_reading_points_enabled", valueKey: "alert_reading_points_value", label: "Read an alert", description: "Only alerts you mark as eligible for points.", icon: Bell },
  { key: "road_viewing_points_enabled", valueKey: "road_viewing_points_value", label: "View a road update", description: "Published road details.", icon: Route },
  { key: "hazard_viewing_points_enabled", valueKey: "hazard_viewing_points_value", label: "View a hazard", description: "Published area hazard details.", icon: Map },
  { key: "incident_report_points_enabled", valueKey: "incident_report_points_value", label: "Approved report", description: "Only after an admin approves the points. Never delays the response.", icon: FileText },
  { key: "crisis_feedback_points_enabled", valueKey: "crisis_feedback_points_value", label: "Approved feedback", description: "Suggested amount. The admin picks the final amount when approving.", icon: MessageSquare, limits: true },
  { key: "tourist_guide_completion_points_enabled", fixed: 10, label: "Finish How to Use", description: "Once, when a tourist finishes the guide.", icon: CheckCircle },
];

const FEEDBACK_LIMITS = [
  { key: "crisis_feedback_points_min_value", label: "Lowest" },
  { key: "crisis_feedback_points_max_value", label: "Highest" },
  { key: "crisis_feedback_daily_submission_cap", label: "Per tourist per day", unit: "awards" },
];

function ToggleIndicator({ enabled, enabledLabel = "On", disabledLabel = "Off" }) {
  return (
    <span className="flex shrink-0 flex-col items-center gap-1 sm:flex-row sm:gap-2">
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? "bg-blue-600" : "bg-zinc-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
      <span className={`text-[10px] font-black uppercase tracking-widest ${
        enabled ? "text-blue-600" : "text-zinc-400"
      }`}>
        {enabled ? enabledLabel : disabledLabel}
      </span>
    </span>
  );
}

export default function AdminSettingsPage() {
  const [audience, setAudience] = useState({ tourists: true, guides: true, admins: false });
  const [visibility, setVisibility] = useState({ map: true, roadsAndHazards: true });
  const [guideAssistance, setGuideAssistance] = useState({
    enabled: false,
    introductoryInformation: "",
    availabilityMessage: "",
  });
  const [rewardsSettings, setRewardsSettings] = useState({
    rewards_enabled: true,
    registration_points_enabled: true,
    registration_points_value: "",
    profile_completion_points_enabled: true,
    profile_completion_points_value: "",
    alert_reading_points_enabled: true,
    alert_reading_points_value: "",
    road_viewing_points_enabled: true,
    road_viewing_points_value: "",
    hazard_viewing_points_enabled: true,
    hazard_viewing_points_value: "",
    crisis_feedback_points_enabled: true,
    crisis_feedback_points_min_value: 1,
    crisis_feedback_points_value: "",
    crisis_feedback_points_max_value: 100,
    crisis_feedback_daily_submission_cap: 1,
    incident_report_points_enabled: false,
    incident_report_points_value: 5,
    tourist_guide_completion_points_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [savingGuideAssistance, setSavingGuideAssistance] = useState(false);
  const [savingRewards, setSavingRewards] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [diagPhone, setDiagPhone] = useState("");
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState(null);
  const [emailDiagnostics, setEmailDiagnostics] = useState(null);
  const [message, setMessage] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load settings");
      setAudience(data.settings.notification_audience);
      if (data.settings.public_visibility) setVisibility(data.settings.public_visibility);
      setGuideAssistance({
        enabled: data.settings.tourist_guide_assistance_enabled === true,
        introductoryInformation: data.settings.tourist_guide_assistance_intro || "",
        availabilityMessage: data.settings.tourist_guide_assistance_availability || "",
      });
      setRewardsSettings({
        rewards_enabled: data.settings.rewards_enabled,
        registration_points_enabled: data.settings.registration_points_enabled,
        registration_points_value: data.settings.registration_points_value,
        profile_completion_points_enabled: data.settings.profile_completion_points_enabled,
        profile_completion_points_value: data.settings.profile_completion_points_value,
        alert_reading_points_enabled: data.settings.alert_reading_points_enabled,
        alert_reading_points_value: data.settings.alert_reading_points_value,
        road_viewing_points_enabled: data.settings.road_viewing_points_enabled,
        road_viewing_points_value: data.settings.road_viewing_points_value,
        hazard_viewing_points_enabled: data.settings.hazard_viewing_points_enabled,
        hazard_viewing_points_value: data.settings.hazard_viewing_points_value,
        crisis_feedback_points_enabled: data.settings.crisis_feedback_points_enabled,
        crisis_feedback_points_min_value: data.settings.crisis_feedback_points_min_value,
        crisis_feedback_points_value: data.settings.crisis_feedback_points_value,
        crisis_feedback_points_max_value: data.settings.crisis_feedback_points_max_value,
        crisis_feedback_daily_submission_cap: data.settings.crisis_feedback_daily_submission_cap,
        incident_report_points_enabled: data.settings.incident_report_points_enabled,
        incident_report_points_value: data.settings.incident_report_points_value,
        tourist_guide_completion_points_enabled: data.settings.tourist_guide_completion_points_enabled,
      });
      setUpdatedAt(data.settings.updated_at);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    authFetch("/api/admin/email-test")
      .then((res) => res.json())
      .then((data) => setEmailDiagnostics(data.diagnostics))
      .catch(() => {});
  }, [loadSettings]);

  const toggleAudience = (key) => {
    setAudience((prev) => ({ ...prev, [key]: !prev[key] }));
    setMessage(null);
  };

  const handleSave = async () => {
    if (!audience.tourists && !audience.guides && !audience.admins) {
      setMessage({ type: "error", text: "Enable at least one recipient group." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ notification_audience: audience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setAudience(data.settings.notification_audience);
      setUpdatedAt(data.settings.updated_at);
      setMessage({ type: "success", text: "Settings saved. Future broadcasts will use this audience." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisibility = async () => {
    setSavingVisibility(true);
    setMessage(null);
    try {
      const res = await authFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ public_visibility: visibility }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save public visibility");
      if (data.settings.public_visibility) setVisibility(data.settings.public_visibility);
      setUpdatedAt(data.settings.updated_at);
      setMessage({ type: "success", text: "Public visibility saved. Visitors see only what is turned on." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleSaveGuideAssistance = async () => {
    setSavingGuideAssistance(true);
    setMessage(null);
    try {
      const res = await authFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          tourist_guide_assistance_enabled: guideAssistance.enabled,
          tourist_guide_assistance_intro: guideAssistance.introductoryInformation,
          tourist_guide_assistance_availability: guideAssistance.availabilityMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save help request settings");
      setGuideAssistance({
        enabled: data.settings.tourist_guide_assistance_enabled === true,
        introductoryInformation: data.settings.tourist_guide_assistance_intro || "",
        availabilityMessage: data.settings.tourist_guide_assistance_availability || "",
      });
      setUpdatedAt(data.settings.updated_at);
      setMessage({ type: "success", text: "Help request settings saved." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingGuideAssistance(false);
    }
  };

  const handleSaveRewards = async () => {
    setSavingRewards(true);
    setMessage(null);
    try {
      const res = await authFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(rewardsSettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save rewards settings");
      setRewardsSettings({
        rewards_enabled: data.settings.rewards_enabled,
        registration_points_enabled: data.settings.registration_points_enabled,
        registration_points_value: data.settings.registration_points_value,
        profile_completion_points_enabled: data.settings.profile_completion_points_enabled,
        profile_completion_points_value: data.settings.profile_completion_points_value,
        alert_reading_points_enabled: data.settings.alert_reading_points_enabled,
        alert_reading_points_value: data.settings.alert_reading_points_value,
        road_viewing_points_enabled: data.settings.road_viewing_points_enabled,
        road_viewing_points_value: data.settings.road_viewing_points_value,
        hazard_viewing_points_enabled: data.settings.hazard_viewing_points_enabled,
        hazard_viewing_points_value: data.settings.hazard_viewing_points_value,
        crisis_feedback_points_enabled: data.settings.crisis_feedback_points_enabled,
        crisis_feedback_points_min_value: data.settings.crisis_feedback_points_min_value,
        crisis_feedback_points_value: data.settings.crisis_feedback_points_value,
        crisis_feedback_points_max_value: data.settings.crisis_feedback_points_max_value,
        crisis_feedback_daily_submission_cap: data.settings.crisis_feedback_daily_submission_cap,
        incident_report_points_enabled: data.settings.incident_report_points_enabled,
        incident_report_points_value: data.settings.incident_report_points_value,
        tourist_guide_completion_points_enabled: data.settings.tourist_guide_completion_points_enabled,
      });
      setUpdatedAt(data.settings.updated_at);
      setMessage({ type: "success", text: "Rewards activity settings saved." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingRewards(false);
    }
  };

  const handleExport = async (type) => {
    setExporting(type);
    setMessage(null);
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch(`/api/admin/export?type=${type}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = type === "users" ? "connect-daet-users.csv" : "connect-daet-incidents.csv";
      link.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `${type === "users" ? "Users" : "Incidents"} export downloaded.` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setExporting(null);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setMessage(null);
    try {
      const res = await authFetch("/api/admin/email-test", { method: "POST", body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) {
        const hint =
          data.step === "config" && data.diagnostics?.missingEnvVars?.length
            ? ` Missing env: ${data.diagnostics.missingEnvVars.join(", ")}. Redeploy after adding them in Vercel.`
            : data.step === "config"
              ? " Redeploy Vercel after saving env vars."
              : "";
        throw new Error(`${data.error || "Email test failed"}${hint}`);
      }
      setMessage({
        type: "success",
        text: `Test email sent via ${data.provider}${data.messageId ? ` (${data.messageId})` : ""} to ${data.to}.`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleDiagnoseTouristSms = async () => {
    setDiagLoading(true);
    setDiagResult(null);
    setMessage(null);
    try {
      const res = await authFetch("/api/admin/sms-diagnose", {
        method: "POST",
        body: JSON.stringify({ phone: diagPhone.trim(), sendTest: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Diagnose failed");
      setDiagResult(data);
      if (data.send?.success) {
        setMessage({
          type: "success",
          text: `SMS accepted for ${data.phoneNormalized}${data.send.detectedNetwork ? ` (${data.send.detectedNetwork})` : ""}. ID: ${data.send.messageId || "—"}`,
        });
      } else if (data.send) {
        setMessage({
          type: "error",
          text: data.send.adminHint || data.send.error || "SMS not accepted by Semaphore.",
        });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setDiagLoading(false);
    }
  };

  const handleTestSms = async () => {
    setTestingSms(true);
    setMessage(null);
    try {
      const res = await authFetch("/api/admin/sms-test", { method: "POST", body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.adminHint || data.error || "SMS test failed");
      }
      setMessage({
        type: "success",
        text: `SMS accepted by Semaphore for ${data.normalizedPhone}${data.messageId ? ` (${data.messageId})` : ""}.${data.deliveryStatus ? ` Status: ${data.deliveryStatus}.` : ""} ${data.note || ""}`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setTestingSms(false);
    }
  };

  return (
    <>
      <DashboardPageHeader
        title={ROLE_INTERFACE.admin.settings.title}
        description={ROLE_INTERFACE.admin.settings.description}
      />
      <RoleContextBanner helper={ROLE_INTERFACE.admin.settings.helper} tone="info" />

      <Link
        href="/admin/how-to-use"
        className="flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-3 transition-colors hover:bg-blue-50"
      >
        <span className="flex min-w-0 items-center gap-3">
          <BookOpen size={20} className="shrink-0 text-blue-600" />
          <span className="min-w-0">
            <span className="block text-sm font-black text-zinc-900">How to Use</span>
            <span className="block text-xs font-medium text-zinc-600">Eight short steps for running CONNECT-DAET, from sending alerts to escalation.</span>
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-blue-600" />
      </Link>

      {message && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-medium ${
          message.type === "success"
            ? "bg-green-50 border border-green-100 text-green-800"
            : "bg-red-50 border border-red-100 text-red-700"
        }`}>
          {message.type === "success" ? (
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          {message.text}
        </div>
      )}

      <AdminPanel
        title="Help requests"
        subtitle="Control whether registered tourists can submit guide assistance requests."
      >
        {loading ? (
          <SettingsPanelSkeleton rows={3} />
        ) : (
          <>
            <button
              type="button"
              role="switch"
              aria-checked={guideAssistance.enabled}
              onClick={() => {
                setGuideAssistance((current) => ({ ...current, enabled: !current.enabled }));
                setMessage(null);
              }}
              className={`mb-5 flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                guideAssistance.enabled
                  ? "border-blue-200 bg-blue-50"
                  : "border-zinc-100 bg-zinc-50 opacity-75"
              }`}
            >
              <Compass
                size={18}
                className={guideAssistance.enabled ? "mt-0.5 shrink-0 text-blue-600" : "mt-0.5 shrink-0 text-zinc-400"}
              />
              <span className="flex-1">
                <span className="block text-sm font-black uppercase tracking-wide text-zinc-900">
                  Tourist guide requests
                </span>
                <span className="mt-1 block text-xs font-medium text-zinc-500">
                  When off, the request card is hidden and the server rejects new tourist requests. Existing reports remain available to administrators.
                </span>
              </span>
              <ToggleIndicator enabled={guideAssistance.enabled} />
            </button>
            <label className="mb-5 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-600">
                Introductory information (optional)
              </span>
              <textarea
                rows={3}
                maxLength={2000}
                value={guideAssistance.introductoryInformation}
                onChange={(event) => {
                  setGuideAssistance((current) => ({
                    ...current,
                    introductoryInformation: event.target.value,
                  }));
                  setMessage(null);
                }}
                placeholder="Explain what tourists can request from a guide."
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 focus:border-blue-400 focus:outline-none"
              />
              <span className="mt-1 block text-xs text-zinc-500">Up to 2,000 characters.</span>
            </label>
            <label className="mb-5 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-600">
                Service availability message (optional)
              </span>
              <input
                type="text"
                maxLength={500}
                value={guideAssistance.availabilityMessage}
                onChange={(event) => {
                  setGuideAssistance((current) => ({
                    ...current,
                    availabilityMessage: event.target.value,
                  }));
                  setMessage(null);
                }}
                placeholder="For example: Guide requests are reviewed daily, 8 AM–5 PM."
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 focus:border-blue-400 focus:outline-none"
              />
              <span className="mt-1 block text-xs text-zinc-500">Up to 500 characters.</span>
            </label>
            <button
              type="button"
              onClick={handleSaveGuideAssistance}
              disabled={savingGuideAssistance}
              className={`${adminShell.btnPrimary} w-full py-3.5 disabled:opacity-50`}
            >
              {savingGuideAssistance
                ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
                : "Save help request settings"}
            </button>
          </>
        )}
      </AdminPanel>

      <AdminPanel
        title="Public visibility"
        subtitle="Turn these off to hide them from visitors. Admin and guide screens stay the same."
      >
        {loading ? (
          <SettingsPanelSkeleton rows={2} />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  key: "map",
                  label: "Alerts map",
                  description: "The affected-areas map on the public Alerts page.",
                  icon: Map,
                },
                {
                  key: "roadsAndHazards",
                  label: "Roads and hazards",
                  description: "The public Roads & Hazards page, area hazards, and those links in the visitor menu.",
                  icon: Route,
                },
              ].map(({ key, label, description, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={visibility[key]}
                  onClick={() => {
                    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
                    setMessage(null);
                  }}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
                    visibility[key]
                      ? "bg-blue-50 border-blue-200"
                      : "bg-zinc-50 border-zinc-100 opacity-75"
                  }`}
                >
                  <Icon size={18} className={visibility[key] ? "text-blue-600 shrink-0 mt-0.5" : "text-zinc-400 shrink-0 mt-0.5"} />
                  <div className="flex-1">
                    <p className="font-black text-sm uppercase tracking-wide text-zinc-900">{label}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">{description}</p>
                  </div>
                  <ToggleIndicator enabled={visibility[key]} />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSaveVisibility}
              disabled={savingVisibility}
              className={`${adminShell.btnPrimary} w-full py-3.5 disabled:opacity-50`}
            >
              {savingVisibility ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save public visibility"}
            </button>
          </>
        )}
      </AdminPanel>

      <AdminPanel
        title="Rewards program"
        subtitle="Configure the program and optional one-time point awards for tourists."
      >
        {loading ? (
          <SettingsPanelSkeleton rows={3} />
        ) : (
          <>
            <button
              type="button"
              role="switch"
              aria-checked={rewardsSettings.rewards_enabled}
              onClick={() => {
                setRewardsSettings((prev) => ({ ...prev, rewards_enabled: !prev.rewards_enabled }));
                setMessage(null);
              }}
              className={`mb-4 flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                rewardsSettings.rewards_enabled ? "bg-blue-50 border-blue-200" : "bg-zinc-50 border-zinc-200"
              }`}
            >
              <Gift size={18} className={rewardsSettings.rewards_enabled ? "shrink-0 text-blue-600" : "shrink-0 text-zinc-400"} />
              <span className="flex-1">
                <span className="block text-sm font-black uppercase tracking-wide text-zinc-900">Rewards program</span>
                <span className="mt-0.5 block text-xs font-medium text-zinc-500">Main switch. When off, no points are given for anything below.</span>
              </span>
              <ToggleIndicator enabled={rewardsSettings.rewards_enabled} />
            </button>

            <div className={`overflow-hidden rounded-2xl border border-zinc-200 ${rewardsSettings.rewards_enabled ? "" : "opacity-60"}`}>
              <div className="hidden grid-cols-[minmax(0,1fr)_6.5rem_8rem] gap-4 bg-zinc-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 sm:grid">
                <span>Tourists earn points for</span>
                <span>On / off</span>
                <span className="text-right">Points</span>
              </div>
              <ul className="divide-y divide-zinc-100">
                {REWARD_ROWS.map(({ key, valueKey, fixed, label, description, icon: Icon, limits }) => {
                  const on = rewardsSettings[key] === true;
                  return (
                    <li key={key} className="px-4 py-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_8rem] sm:gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <Icon size={16} className={on ? "mt-0.5 shrink-0 text-blue-600" : "mt-0.5 shrink-0 text-zinc-400"} />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-zinc-900">{label}</p>
                            <p className="text-xs font-medium text-zinc-500">{description}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={`${label}: ${on ? "on" : "off"}`}
                          onClick={() => {
                            setRewardsSettings((prev) => ({ ...prev, [key]: !prev[key] }));
                            setMessage(null);
                          }}
                          className="justify-self-end sm:justify-self-start"
                        >
                          <ToggleIndicator enabled={on} />
                        </button>
                        <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
                          {fixed ? (
                            <span className="text-sm font-black text-zinc-700">{fixed} pts</span>
                          ) : (
                            <label className="flex items-center gap-2">
                              <span className="sr-only">Points for {label}</span>
                              <input
                          type="number"
                          min="0"
                          max="1000000"
                          step="1"
                          disabled={!on}
                          value={rewardsSettings[valueKey]}
                          onChange={(event) => {
                            const value = event.target.value;
                            setRewardsSettings((prev) => ({ ...prev, [valueKey]: value === "" ? "" : Number(value) }));
                            setMessage(null);
                          }}
                          className="w-20 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm font-bold text-zinc-900 focus:border-blue-400 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
                        />
                              <span className="text-xs font-black text-zinc-500">pts</span>
                            </label>
                          )}
                        </div>
                      </div>
                      {limits && on ? (
                        <div className="mt-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-600">
                          <span className="mr-auto">Award limits</span>
                          {FEEDBACK_LIMITS.map(({ key: limitKey, label: limitLabel, unit = "pts" }) => (
                            <label key={limitKey} className="flex items-center gap-2">
                              <span>{limitLabel}</span>
                              <input
                          type="number"
                          min="0"
                          max="1000000"
                          step="1"
                          disabled={false}
                          value={rewardsSettings[limitKey]}
                          onChange={(event) => {
                            const value = event.target.value;
                            setRewardsSettings((prev) => ({ ...prev, [limitKey]: value === "" ? "" : Number(value) }));
                            setMessage(null);
                          }}
                          className="w-20 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm font-bold text-zinc-900 focus:border-blue-400 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
                        />
                              <span className="text-zinc-500">{unit}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="mb-4 mt-3 text-xs font-medium text-zinc-500">
              Whole numbers from 0 to 1,000,000. Set a reward to 0, or switch it off, to stop just that one. Points are a placeholder balance and cannot be redeemed.
            </p>

            <button
              type="button"
              onClick={handleSaveRewards}
              disabled={savingRewards}
              className={`${adminShell.btnPrimary} w-full py-3.5 disabled:opacity-50`}
            >
              {savingRewards ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save rewards settings"}
            </button>
          </>
        )}
      </AdminPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AdminPanel
          title="Notification audience"
          subtitle="Who receives crisis alerts and area hazard SMS/email/in-app notifications"
        >
          {loading ? (
            <SettingsPanelSkeleton rows={4} />
          ) : (
            <>
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {AUDIENCE_ROLE_OPTIONS.map(({ key, label, description }) => (
                  <button
                    key={key}
                    type="button"
                    role="switch"
                    aria-checked={audience[key]}
                    onClick={() => toggleAudience(key)}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
                      audience[key]
                        ? "bg-blue-50 border-blue-200"
                        : "bg-zinc-50 border-zinc-100 opacity-75"
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-black text-sm uppercase tracking-wide text-zinc-900">{label}</p>
                      <p className="text-xs text-zinc-500 mt-1 font-medium">{description}</p>
                    </div>
                    <ToggleIndicator
                      enabled={audience[key]}
                      enabledLabel="Included"
                      disabledLabel="Excluded"
                    />
                  </button>
                ))}
              </div>

              <p className="text-xs text-zinc-500 font-medium mb-4">
                When you broadcast with <strong>Email</strong> enabled, every included tourist with an email on their profile receives the alert (mandatory for emergencies).
                SMS and in-app still follow each user&apos;s Profile preferences. Administrators are
                <strong> excluded by default</strong> so tourism office staff are not texted when broadcasting to the public.
              </p>

              {updatedAt && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
                  Last updated: {new Date(updatedAt).toLocaleString()}
                </p>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`${adminShell.btnPrimary} w-full py-3.5 disabled:opacity-50`}
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Notification Settings"}
              </button>
            </>
          )}
        </AdminPanel>

        <AdminPanel title="Data export" subtitle="Download CSV snapshots for reporting">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleExport("users")}
              disabled={exporting === "users"}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left disabled:opacity-50"
            >
              <Users size={20} className="text-blue-600 shrink-0" />
              <div className="flex-1">
                <p className="font-black text-sm uppercase tracking-wide text-zinc-900">Export Users</p>
                <p className="text-xs text-zinc-500 mt-1">All registered profiles — name, email, phone, role</p>
              </div>
              {exporting === "users" && <Loader2 size={16} className="animate-spin text-zinc-400" />}
            </button>

            <button
              type="button"
              onClick={() => handleExport("incidents")}
              disabled={exporting === "incidents"}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left disabled:opacity-50"
            >
              <FileText size={20} className="text-orange-600 shrink-0" />
              <div className="flex-1">
                <p className="font-black text-sm uppercase tracking-wide text-zinc-900">Export Incidents</p>
                <p className="text-xs text-zinc-500 mt-1">Incident reports — reference, severity, status, location</p>
              </div>
              {exporting === "incidents" && <Loader2 size={16} className="animate-spin text-zinc-400" />}
            </button>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel
        title="Delivery testing"
        subtitle="Send a test to your admin profile email/phone to verify env configuration"
      >
          <div className="mb-4">
            {emailDiagnostics && (
              <div className="mt-2 text-[11px] text-zinc-500 font-medium space-y-1">
                <p>
                  <span className="font-black uppercase text-zinc-400">From:</span>{" "}
                  {emailDiagnostics.fromAddress}
                  {emailDiagnostics.provider !== "none" ? (
                    <span className="ml-2 text-green-700">({emailDiagnostics.provider})</span>
                  ) : (
                    <span className="ml-2 text-amber-700">(not configured)</span>
                  )}
                </p>
                <p>
                  <span className="font-black uppercase text-zinc-400">To:</span>{" "}
                  {emailDiagnostics.recipientSource}
                </p>
              </div>
            )}
          </div>
        <div className="mb-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50/80 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Validate a tourist number and send a Semaphore test SMS
          </p>
          <input
            className={`${adminShell.input} w-full`}
            placeholder="09XXXXXXXXX — same as tourist profile"
            value={diagPhone}
            onChange={(e) => setDiagPhone(e.target.value)}
          />
          <button
            type="button"
            onClick={handleDiagnoseTouristSms}
            disabled={diagLoading || !diagPhone.trim()}
            className={`${adminShell.btnPrimary} w-full justify-center disabled:opacity-50`}
          >
            {diagLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            {diagLoading ? "Diagnosing…" : "Diagnose & test send"}
          </button>
          {diagResult?.network?.network ? (
            <p className="text-xs text-zinc-600 font-medium">
              Semaphore reports this network: <strong>{diagResult.network.network}</strong>
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testingEmail}
            className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest hover:bg-blue-700 disabled:opacity-50"
          >
            {testingEmail ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            {testingEmail ? "Sending..." : "Test Email"}
          </button>
          <button
            type="button"
            onClick={handleTestSms}
            disabled={testingSms}
            className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-zinc-900 text-white font-black uppercase text-xs tracking-widest hover:bg-zinc-800 disabled:opacity-50"
          >
            {testingSms ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
            {testingSms ? "Sending..." : "Test SMS"}
          </button>
        </div>
      </AdminPanel>

      <EscalationSettingsPanel />

      <AdminPanel title="System notes" bodyClassName="bg-zinc-50/80">
        <ul className="text-sm text-zinc-600 font-medium space-y-2 list-disc pl-5">
          <li>Alert channels (email/SMS/app) control <em>how</em> an alert is sent; this page controls <em>who</em> receives it.</li>
          <li>
            SMS tries the configured primary provider and falls back to the other provider if sending fails. Configure <code className="text-xs bg-white px-1 rounded">SMS_PRIMARY_PROVIDER</code>, <code className="text-xs bg-white px-1 rounded">SEMAPHORE_API_KEY</code>, and <code className="text-xs bg-white px-1 rounded">IPROG_SMS_API_TOKEN</code>.
            An optional Semaphore sender name can be set with <code className="text-xs bg-white px-1 rounded">SEMAPHORE_SENDER_NAME</code>. Manage sender names in your{" "}
            <a
              href="https://semaphore.co/account"
              className="text-blue-600 font-bold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Semaphore account
            </a>
            ; if omitted, Semaphore uses the account&apos;s default sender name.
          </li>
          <li>Email delivery: use your <strong>office inbox</strong> via SMTP, or your <strong>own domain</strong> via Resend. Recipients are always each user&apos;s registered profile email.</li>
          <li>SMTP (own Gmail/Workspace/Outlook): <code className="text-xs bg-white px-1 rounded">SMTP_HOST</code>, <code className="text-xs bg-white px-1 rounded">SMTP_USER</code>, <code className="text-xs bg-white px-1 rounded">SMTP_PASS</code>, <code className="text-xs bg-white px-1 rounded">EMAIL_FROM</code></li>
          <li>Resend (own domain): <code className="text-xs bg-white px-1 rounded">RESEND_API_KEY</code> + <code className="text-xs bg-white px-1 rounded">EMAIL_FROM</code></li>
          <li>Individual users can opt out of channels in Profile → Communication Preferences.</li>
        </ul>
      </AdminPanel>
    </>
  );
}
