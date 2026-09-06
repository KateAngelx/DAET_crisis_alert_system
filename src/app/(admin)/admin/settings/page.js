"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Settings, Users, FileText, Download, Bell, Loader2, CheckCircle, AlertCircle,
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [message, setMessage] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load settings");
      setAudience(data.settings.notification_audience);
      setUpdatedAt(data.settings.updated_at);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
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

  return (
    <div className="space-y-6 text-left pb-8">
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="font-black uppercase tracking-tight text-zinc-900">Notification Audience</h2>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Who receives crisis alerts and area hazard SMS/email/in-app notifications
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500 py-8 justify-center">
              <Loader2 size={16} className="animate-spin" /> Loading settings...
            </div>
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
                Each person&apos;s own communication preferences (Profile) still apply. Administrators are
                <strong> excluded by default</strong> so LGU staff are not texted when broadcasting to the public.
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
                className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Notification Settings"}
              </button>
            </>
          )}
        </Card>

        <Card className="p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-zinc-800 text-white rounded-xl">
              <Download size={18} />
            </div>
            <div>
              <h2 className="font-black uppercase tracking-tight text-zinc-900">Data Export</h2>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">Download CSV snapshots for reporting</p>
            </div>
          </div>

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
        </Card>
      </div>

      <Card className="p-6 rounded-3xl bg-zinc-50 border-zinc-200">
        <div className="flex items-center gap-3 mb-2">
          <Settings size={18} className="text-zinc-500" />
          <h2 className="font-black uppercase tracking-tight text-zinc-900 text-sm">System Notes</h2>
        </div>
        <ul className="text-sm text-zinc-600 font-medium space-y-2 list-disc pl-5">
          <li>Crisis Command Center alert channels (email/SMS/app) control <em>how</em> an alert is sent; this page controls <em>who</em> receives it.</li>
          <li>SMS delivery uses iProg — ensure <code className="text-xs bg-white px-1 rounded">IPROG_SMS_API_TOKEN</code> is set in environment variables.</li>
          <li>Individual users can opt out of channels in Profile → Communication Preferences.</li>
        </ul>
      </Card>
    </div>
  );
}
