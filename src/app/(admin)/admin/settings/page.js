"use client";

import React, { useCallback, useEffect, useState } from "react";
import { SettingsPanelSkeleton } from "@/app/components/ui/Skeletons";
import {
  Users, FileText, Download, Bell, Loader2, CheckCircle, AlertCircle, Mail, MessageSquare, Map, Route,
  Coins, Gift, Compass,
} from "lucide-react";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
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
      if (!res.ok) throw new Error(data.error || "Failed to save Tourist Guide Assistance settings");
      setGuideAssistance({
        enabled: data.settings.tourist_guide_assistance_enabled === true,
        introductoryInformation: data.settings.tourist_guide_assistance_intro || "",
        availabilityMessage: data.settings.tourist_guide_assistance_availability || "",
      });
      setUpdatedAt(data.settings.updated_at);
      setMessage({ type: "success", text: "Tourist Guide Assistance settings saved." });
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
          text: `SMS accepted for ${data.phoneNormalized}. Network: ${data.network?.network || data.send.detectedNetwork || "—"}. ID: ${data.send.messageId || "—"}`,
        });
      } else if (data.send) {
        setMessage({
          type: "error",
          text: data.send.adminHint || data.send.error || "SMS not accepted by iProg.",
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
        text: `SMS accepted by iProg for ${data.normalizedPhone}${data.messageId ? ` (${data.messageId})` : ""}.${data.deliveryStatus ? ` Status: ${data.deliveryStatus}.` : ""} ${data.note || ""}`,
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
        title="Tourist Guide Assistance"
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
              <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest ${
                guideAssistance.enabled ? "text-blue-600" : "text-zinc-400"
              }`}>
                {guideAssistance.enabled ? "On" : "Off"}
              </span>
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
                : "Save Tourist Guide Assistance"}
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
            <div className="space-y-3 mb-6">
              {[
                {
                  key: "map",
                  label: "Crisis Hub map",
                  description: "The affected-areas map on the public Crisis Hub.",
                  icon: Map,
                },
                {
                  key: "roadsAndHazards",
                  label: "Roads and hazards",
                  description: "The public Roads & Travel page, area hazards, and those links in the visitor menu.",
                  icon: Route,
                },
              ].map(({ key, label, description, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
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
                  <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${visibility[key] ? "text-blue-600" : "text-zinc-400"}`}>
                    {visibility[key] ? "On" : "Off"}
                  </span>
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
            <div className="space-y-3 mb-5">
              {[
                {
                  key: "rewards_enabled",
                  label: "Rewards program",
                  description: "When off, no reward points are awarded.",
                  icon: Gift,
                },
                {
                  key: "registration_points_enabled",
                  label: "Registration points",
                  description: "Award points once when a new tourist profile is created.",
                  icon: Coins,
                },
                {
                  key: "profile_completion_points_enabled",
                  label: "Profile completion points",
                  description: "Award points once when a tourist first completes all required profile fields.",
                  icon: Users,
                },
                {
                  key: "alert_reading_points_enabled",
                  label: "Alert reading points",
                  description: "Allow points for reading explicitly eligible public advisories.",
                  icon: Bell,
                },
                {
                  key: "road_viewing_points_enabled",
                  label: "Viewing road information",
                  description: "Allow points for viewing published road advisory details.",
                  icon: Route,
                },
                {
                  key: "hazard_viewing_points_enabled",
                  label: "Viewing hazard information",
                  description: "Allow points for viewing published area hazard details.",
                  icon: Map,
                },
                {
                  key: "crisis_feedback_points_enabled",
                  label: "Crisis feedback rewards",
                  description: "Allow optional point awards for approved registered-tourist submissions. Approval itself never awards points.",
                  icon: MessageSquare,
                },
                {
                  key: "incident_report_points_enabled",
                  label: "Incident reporting rewards",
                  description: "Allow optional points for eligible tourist incident reports after an administrator approves the points decision. Incident response is never delayed by this setting.",
                  icon: FileText,
                },
                {
                  key: "tourist_guide_completion_points_enabled",
                  label: "Tourist guide completion reward",
                  description: "Award exactly 10 points once when a tourist marks the How to Use guide as completed.",
                  icon: CheckCircle,
                },
              ].map(({ key, label, description, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={rewardsSettings[key]}
                  onClick={() => {
                    setRewardsSettings((prev) => ({ ...prev, [key]: !prev[key] }));
                    setMessage(null);
                  }}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
                    rewardsSettings[key]
                      ? "bg-blue-50 border-blue-200"
                      : "bg-zinc-50 border-zinc-100 opacity-75"
                  }`}
                >
                  <Icon size={18} className={rewardsSettings[key] ? "text-blue-600 shrink-0 mt-0.5" : "text-zinc-400 shrink-0 mt-0.5"} />
                  <div className="flex-1">
                    <p className="font-black text-sm uppercase tracking-wide text-zinc-900">{label}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">{description}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${rewardsSettings[key] ? "text-blue-600" : "text-zinc-400"}`}>
                    {rewardsSettings[key] ? "On" : "Off"}
                  </span>
                </button>
              ))}
            </div>

            <label className="block mb-5">
              <span className="block text-xs font-black uppercase tracking-widest text-zinc-600 mb-2">
                Points for registration
              </span>
              <input
                type="number"
                min="0"
                max="1000000"
                step="1"
                value={rewardsSettings.registration_points_value}
                onChange={(event) => {
                  const value = event.target.value;
                  setRewardsSettings((prev) => ({
                    ...prev,
                    registration_points_value: value === "" ? "" : Number(value),
                  }));
                  setMessage(null);
                }}
                className="w-full sm:max-w-xs rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 focus:border-blue-400 focus:outline-none"
              />
              <span className="block text-xs text-zinc-500 mt-2">
                Enter a whole number from 0 to 1,000,000. Set to 0 to disable the award without disabling the program.
              </span>
            </label>

            <label className="block mb-5">
              <span className="block text-xs font-black uppercase tracking-widest text-zinc-600 mb-2">
                Points for completing a tourist profile
              </span>
              <input
                type="number"
                min="0"
                max="1000000"
                step="1"
                value={rewardsSettings.profile_completion_points_value}
                onChange={(event) => {
                  const value = event.target.value;
                  setRewardsSettings((prev) => ({
                    ...prev,
                    profile_completion_points_value: value === "" ? "" : Number(value),
                  }));
                  setMessage(null);
                }}
                className="w-full sm:max-w-xs rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 focus:border-blue-400 focus:outline-none"
              />
              <span className="block text-xs text-zinc-500 mt-2">
                Enter a whole number from 0 to 1,000,000. The award is issued only on first completion.
              </span>
            </label>

            <label className="block mb-5">
              <span className="block text-xs font-black uppercase tracking-widest text-zinc-600 mb-2">
                Points for reading an eligible advisory
              </span>
              <input
                type="number"
                min="0"
                max="1000000"
                step="1"
                value={rewardsSettings.alert_reading_points_value}
                onChange={(event) => {
                  const value = event.target.value;
                  setRewardsSettings((prev) => ({
                    ...prev,
                    alert_reading_points_value: value === "" ? "" : Number(value),
                  }));
                  setMessage(null);
                }}
                className="w-full sm:max-w-xs rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 focus:border-blue-400 focus:outline-none"
              />
              <span className="block text-xs text-zinc-500 mt-2">
                Enter a whole number from 0 to 1,000,000. Registration points have separate controls.
              </span>
            </label>

            <label className="block mb-5">
              <span className="block text-xs font-black uppercase tracking-widest text-zinc-600 mb-2">
                Points for viewing road information
              </span>
              <input
                type="number"
                min="0"
                max="1000000"
                step="1"
                value={rewardsSettings.road_viewing_points_value}
                onChange={(event) => {
                  const value = event.target.value;
                  setRewardsSettings((prev) => ({
                    ...prev,
                    road_viewing_points_value: value === "" ? "" : Number(value),
                  }));
                  setMessage(null);
                }}
                className="w-full sm:max-w-xs rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 focus:border-blue-400 focus:outline-none"
              />
              <span className="block text-xs text-zinc-500 mt-2">
                Enter a whole number from 0 to 1,000,000. Only published road advisory details qualify.
              </span>
            </label>

            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              {[
                {
                  key: "crisis_feedback_points_min_value",
                  label: "Minimum points per award",
                  min: 1,
                  helper: "Lowest amount an admin may award.",
                },
                {
                  key: "crisis_feedback_points_value",
                  label: "Suggested default points",
                  min: 1,
                  helper: "Prefills the award form; it never triggers an automatic award.",
                },
                {
                  key: "crisis_feedback_points_max_value",
                  label: "Maximum points per award",
                  min: 1,
                  helper: "Highest amount an admin may award.",
                },
                {
                  key: "crisis_feedback_daily_submission_cap",
                  label: "Daily submissions rewarded per tourist",
                  min: 1,
                  helper: "Maximum number of submissions rewarded per tourist per Asia/Manila calendar day.",
                },
              ].map(({ key, label, min, helper }) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-600">
                    {label}
                  </span>
                  <input
                    type="number"
                    min={min}
                    max="1000000"
                    step="1"
                    value={rewardsSettings[key]}
                    onChange={(event) => {
                      const value = event.target.value;
                      setRewardsSettings((prev) => ({
                        ...prev,
                        [key]: value === "" ? "" : Number(value),
                      }));
                      setMessage(null);
                    }}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 focus:border-blue-400 focus:outline-none"
                  />
                  <span className="mt-2 block text-xs text-zinc-500">{helper}</span>
                </label>
              ))}
            </div>
            <p className="mb-5 text-xs font-medium text-zinc-500">
              Award limits must satisfy minimum ≤ default ≤ maximum. Daily limits count awarded submissions, not points.
            </p>

            <label className="block mb-5">
              <span className="block text-xs font-black uppercase tracking-widest text-zinc-600 mb-2">
                Points for an approved incident report
              </span>
              <input
                type="number"
                min="0"
                max="1000000"
                step="1"
                value={rewardsSettings.incident_report_points_value}
                onChange={(event) => {
                  const value = event.target.value;
                  setRewardsSettings((prev) => ({
                    ...prev,
                    incident_report_points_value: value === "" ? "" : Number(value),
                  }));
                  setMessage(null);
                }}
                className="w-full sm:max-w-xs rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 focus:border-blue-400 focus:outline-none"
              />
              <span className="block text-xs text-zinc-500 mt-2">
                Enter a whole number from 0 to 1,000,000. Points are awarded only after an administrator explicitly approves the separate points decision; the global rewards switch also applies.
              </span>
            </label>

            <label className="block mb-5">
              <span className="block text-xs font-black uppercase tracking-widest text-zinc-600 mb-2">
                Points for viewing hazard information
              </span>
              <input
                type="number"
                min="0"
                max="1000000"
                step="1"
                value={rewardsSettings.hazard_viewing_points_value}
                onChange={(event) => {
                  const value = event.target.value;
                  setRewardsSettings((prev) => ({
                    ...prev,
                    hazard_viewing_points_value: value === "" ? "" : Number(value),
                  }));
                  setMessage(null);
                }}
                className="w-full sm:max-w-xs rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 focus:border-blue-400 focus:outline-none"
              />
              <span className="block text-xs text-zinc-500 mt-2">
                Enter a whole number from 0 to 1,000,000. Only published area hazard details qualify.
              </span>
            </label>

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
              <div className="space-y-3 mb-6">
                {AUDIENCE_ROLE_OPTIONS.map(({ key, label, description }) => (
                  <button
                    key={key}
                    type="button"
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
                    <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${audience[key] ? "text-blue-600" : "text-zinc-400"}`}>
                      {audience[key] ? "Included" : "Excluded"}
                    </span>
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
            Diagnose tourist number (iProg network detect + test send)
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
              iProg sees this number as: <strong>{diagResult.network.network}</strong>
              {diagResult.network.isSmartTnt ? " (Smart/TNT — shared sender blocked until you register a sender name)" : null}
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

      <AdminPanel title="System notes" bodyClassName="bg-zinc-50/80">
        <ul className="text-sm text-zinc-600 font-medium space-y-2 list-disc pl-5">
          <li>Crisis Command Center alert channels (email/SMS/app) control <em>how</em> an alert is sent; this page controls <em>who</em> receives it.</li>
          <li>
            SMS uses iProg (<code className="text-xs bg-white px-1 rounded">IPROG_SMS_API_TOKEN</code>) on the 5-credit route.
            Smart/TNT numbers require an{" "}
            <a
              href="https://www.iprogsms.com/sender-names/new"
              className="text-blue-600 font-bold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              approved sender name
            </a>
            ; until then iProg rejects the send and credits are not deducted.
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
