"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { User, Mail, Phone, Globe, Shield, Loader2, CheckCircle, Trash2, AlertTriangle, Coins, History, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { portalShell } from "@/lib/designSystem";
import { useAuthStore } from "@/app/store/crisisStore";
import { InfoPageHero, PublicPageShell, PublicPageContent, PublicPanel } from "@/app/components/InfoPageHero";
import { CommunicationChannelForm } from "@/app/components/CommunicationChannelSetup";
import { WebPushSettings } from "@/app/components/WebPushSettings";
import { ProfileSkeleton } from "@/app/components/ui/Skeletons";
import { ErrorState } from "@/app/components/ui/AsyncState";
import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";
import { notifyRewardEarned } from "@/lib/rewardFeedback";
import { PublicListModal } from "@/app/components/shell/PublicListModal";
import { getActiveSession } from "@/lib/authSession";
import { useInstalledApp } from "@/lib/useInstalledApp";
import { parseApiJson } from "@/lib/parseApiJson";
import { usePublicVisibility } from "@/lib/usePublicVisibility";

const POINTS_HISTORY_PAGE_SIZE = 20;

const ROLE_LABELS = {
  tourist: "Tourist",
  guide: "Tourism Guide",
  admin: "Administrator",
};

function formatPoints(value) {
  return new Intl.NumberFormat().format(BigInt(value ?? 0));
}

function humanizeTransactionValue(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getTransactionLabel(transaction) {
  if (transaction.activity?.title) return `Safety activity · ${transaction.activity.title}`;
  if (transaction.reason === "registration") return "Tourist registration reward";
  if (transaction.reason === "profile_completion") return "Profile completion reward";
  if (transaction.reason === "tourist_guide_completion") return "How to Use CONNECT-DAET guide completion";
  if (transaction.reason === "alert_read") {
    return transaction.alert?.title
      ? `Advisory reading · ${transaction.alert.title}`
      : "Eligible advisory reading";
  }
  if (transaction.reason === "road_view" || transaction.reason === "hazard_view") {
    const type = transaction.reason === "road_view" ? "Road advisory" : "Hazard advisory";
    return transaction.advisory?.title
      ? `${type} · ${transaction.advisory.title}`
      : `${type} viewing reward`;
  }
  if (transaction.reason === "crisis_feedback") {
    const type = transaction.feedback?.submission_type;
    return type ? `Crisis feedback · ${humanizeTransactionValue(type)}` : "Crisis feedback reward";
  }
  if (transaction.reason === "incident_report") {
    const report = transaction.incident;
    const detail = [report?.reference_number, report?.category].filter(Boolean).join(" · ");
    return detail ? `Incident report · ${detail}` : "Incident report reward";
  }
  if (transaction.transaction_type === "spent") {
    return transaction.redemption?.reward_name_snapshot || "Reward redemption";
  }
  if (transaction.transaction_type === "adjustment") {
    return transaction.reason ? humanizeTransactionValue(transaction.reason) : "Points adjustment";
  }
  if (transaction.activity_completion_id) return "Approved safety activity";
  return "Points earned";
}

function ProfileFold({ title, text, open, onToggle, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-6"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>
          <span className="block text-base font-black text-zinc-900">{title}</span>
          <span className="mt-0.5 block text-xs font-medium text-zinc-500">{text}</span>
        </span>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-blue-600">
          {open ? "Hide" : "Open"}
        </span>
      </button>
      {open ? <div className="space-y-4 border-t border-zinc-100 px-4 py-4 sm:px-6">{children}</div> : null}
    </div>
  );
}

function getTransactionStatus(transaction) {
  const statuses = [humanizeTransactionValue(transaction.transaction_type)];
  if (transaction.activity?.status) statuses.push(humanizeTransactionValue(transaction.activity.status));
  if (transaction.feedback?.status) statuses.push(humanizeTransactionValue(transaction.feedback.status));
  if (transaction.feedback?.reward_status) statuses.push(humanizeTransactionValue(transaction.feedback.reward_status));
  if (transaction.incident?.status) statuses.push(humanizeTransactionValue(transaction.incident.status));
  if (transaction.redemption?.status) statuses.push(humanizeTransactionValue(transaction.redemption.status));
  return [...new Set(statuses)].join(" · ");
}

async function fetchPointsData(page, pageSize, action) {
  const session = await getActiveSession();
  if (!session?.access_token) throw new Error("Your session expired. Sign in again to view points.");

  const response = await fetch(`/api/tourist/points?page=${page}&pageSize=${pageSize}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const result = await parseApiJson(response, action);
  if (!response.ok) throw new Error(result.error || `${action} failed.`);
  return result;
}

export default function ProfilePage() {
  const installedApp = useInstalledApp();
  const visibility = usePublicVisibility();
  const { confirm } = useConfirm();
  const { user, isAuthenticated, loading, fetchProfile, updateProfile, updateNotificationChannels, deleteAccount } = useAuthStore();
  const [form, setForm] = useState({ full_name: "", phone: "", nationality: "Filipino" });
  const [channelForm, setChannelForm] = useState({ email: true, sms: true, app: true });
  const [channelSaving, setChannelSaving] = useState(false);
  const [channelMessage, setChannelMessage] = useState(null);
  const [message, setMessage] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [openPanel, setOpenPanel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [points, setPoints] = useState({ balance: 0, transactions: [] });
  const [pointsUserId, setPointsUserId] = useState(null);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [pointsError, setPointsError] = useState(null);
  const [pointsRetry, setPointsRetry] = useState(0);
  const [pointsHistoryOpen, setPointsHistoryOpen] = useState(false);
  const [pointsHistoryPage, setPointsHistoryPage] = useState(1);
  const [pointsHistoryRetry, setPointsHistoryRetry] = useState(0);
  const [pointsHistoryState, setPointsHistoryState] = useState({ requestKey: null, count: 0, transactions: [], error: null });

  const refreshPoints = useCallback((showLoading = true) => {
    if (showLoading) setPointsLoading(true);
    setPointsError(null);
    setPointsRetry((count) => count + 1);
    if (pointsHistoryOpen) setPointsHistoryRetry((count) => count + 1);
  }, [pointsHistoryOpen]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchProfile().then((result) => {
      if (result.success && result.profile) {
        setForm({
          full_name: result.profile.full_name || "",
          phone: result.profile.phone || "",
          nationality: result.profile.nationality || "Filipino",
        });
        setLoadError(null);
      } else if (!result.success) {
        setLoadError(result.error || "Failed to load profile.");
      }
      setInitialized(true);
    });
  }, [isAuthenticated, fetchProfile]);

  useEffect(() => {
    if (user && initialized) {
      setForm({
        full_name: user.name || "",
        phone: user.phone || "",
        nationality: user.nationality || "Filipino",
      });
      if (user.notification_channels) {
        setChannelForm(user.notification_channels);
      }
    }
  }, [user, initialized]);

  useEffect(() => {
    if (!visibility.rewardsEnabled || !isAuthenticated || !user?.id || user?.role !== "tourist") return undefined;

    let cancelled = false;

    async function loadPoints() {
      try {
        const result = await fetchPointsData(1, 3, "Load points");
        if (cancelled) return;

        setPoints({
          balance: result.balance ?? 0,
          transactions: result.transactions || [],
        });
        setPointsUserId(user.id);
        setPointsError(null);
      } catch (error) {
        if (!cancelled) {
          setPointsUserId(user.id);
          setPointsError(error.message || "Unable to load your points.");
        }
      } finally {
        if (!cancelled) setPointsLoading(false);
      }
    }

    loadPoints();
    return () => {
      cancelled = true;
    };
  }, [visibility.rewardsEnabled, isAuthenticated, user?.id, user?.role, pointsRetry]);

  useEffect(() => {
    if (!visibility.rewardsEnabled || !isAuthenticated || !user?.id || user?.role !== "tourist") return undefined;
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") refreshPoints(false);
    };
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    const timer = window.setInterval(refreshIfVisible, 60_000);
    return () => {
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.clearInterval(timer);
    };
  }, [visibility.rewardsEnabled, isAuthenticated, user?.id, user?.role, refreshPoints]);

  const pointsHistoryRequestKey = `${user?.id || ""}:${pointsHistoryPage}:${pointsHistoryRetry}`;
  useEffect(() => {
    if (!visibility.rewardsEnabled || !pointsHistoryOpen || !isAuthenticated || !user?.id || user?.role !== "tourist") return undefined;
    let cancelled = false;
    const requestKey = `${user.id}:${pointsHistoryPage}:${pointsHistoryRetry}`;

    fetchPointsData(pointsHistoryPage, POINTS_HISTORY_PAGE_SIZE, "Load points history")
      .then((result) => {
        if (!cancelled) {
          setPoints((current) => ({ ...current, balance: result.balance ?? current.balance }));
          setPointsHistoryState({ requestKey, count: result.count, transactions: result.transactions, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPointsHistoryState({ requestKey, count: 0, transactions: [], error: error.message || "Unable to load point history." });
        }
      });

    return () => { cancelled = true; };
  }, [visibility.rewardsEnabled, pointsHistoryOpen, isAuthenticated, user?.id, user?.role, pointsHistoryPage, pointsHistoryRetry]);

  useEffect(() => {
    if (!visibility.rewardsEnabled) setPointsHistoryOpen(false);
  }, [visibility.rewardsEnabled]);

  const pointsHistoryIsCurrent = pointsHistoryState.requestKey === pointsHistoryRequestKey;
  const pointsHistoryLoading = pointsHistoryOpen && !pointsHistoryIsCurrent;
  const pointsHistoryError = pointsHistoryIsCurrent ? pointsHistoryState.error : null;
  const pointsHistoryTransactions = pointsHistoryIsCurrent ? pointsHistoryState.transactions : [];
  const pointsHistoryCount = pointsHistoryIsCurrent ? pointsHistoryState.count : 0;
  const pointsHistoryPages = Math.max(1, Math.ceil(pointsHistoryCount / POINTS_HISTORY_PAGE_SIZE));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!form.full_name.trim() || !form.phone.trim()) {
      setMessage({ type: "error", text: "Full name and phone number are required." });
      return;
    }

    const result = await updateProfile({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      nationality: form.nationality,
    });

    if (result.success) {
      if (result.profileCompletionReward) {
        notifyRewardEarned(
          result.profileCompletionReward.points,
          `profile-completion:${result.profileCompletionReward.id}`
        );
        refreshPoints();
      }
      setMessage({ type: "success", text: "Profile updated successfully." });
    } else {
      setMessage({ type: "error", text: result.error || "Failed to update profile." });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    const confirmed = await confirm({
      title: "Delete your account?",
      description: "You will stop receiving all alerts and lose access to CONNECT-DAET. This action cannot be undone.",
      requireText: "DELETE",
      requireTextLabel: "Type DELETE to confirm account removal",
      confirmLabel: "Delete account",
      variant: "danger",
    });
    if (!confirmed) return;

    setDeleting(true);
    const result = await deleteAccount();
    setDeleting(false);
    if (!result.success) {
      setDeleteError(result.error || "Failed to delete account.");
    }
  };

  const handleChannelSave = async (channels) => {
    setChannelMessage(null);
    setChannelSaving(true);
    const result = await updateNotificationChannels(channels, true);
    setChannelSaving(false);
    if (result.success) {
      setChannelForm(channels);
      setChannelMessage({ type: "success", text: "Communication preferences updated." });
    } else {
      setChannelMessage({ type: "error", text: result.error || "Failed to update preferences." });
    }
  };

  if (!isAuthenticated) {
    return (
      <PublicPageShell>
        <InfoPageHero title="My Profile" description="Sign in to manage account details and alert preferences." />
        <PublicPageContent>
          <PublicPanel title="Sign in required">
            <p className="text-sm text-zinc-600 font-medium mb-4">Your profile and communication settings are available after you sign in.</p>
            <Link href="/login" className={portalShell.btnPrimary}>Sign in</Link>
          </PublicPanel>
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <InfoPageHero
        title="My Profile"
        description="View and update your account details for alerts and incident reporting."
      />

      <PublicPageContent className="installed-profile-stack !gap-8">
        {!initialized && loading ? (
          <ProfileSkeleton />
        ) : loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => {
              setInitialized(false);
              setLoadError(null);
              fetchProfile().then((result) => {
                if (result.success && result.profile) {
                  setForm({
                    full_name: result.profile.full_name || "",
                    phone: result.profile.phone || "",
                    nationality: result.profile.nationality || "Filipino",
                  });
                  setLoadError(null);
                } else {
                  setLoadError(result.error || "Failed to load profile.");
                }
                setInitialized(true);
              });
            }}
            title="Could not load profile"
          />
        ) : (
          <>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-blue-600 p-3 text-white">
                  <User size={24} />
                </div>
                <div>
                  <p className="font-black uppercase tracking-tight text-zinc-900">{user?.name}</p>
                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-blue-600">
                    {ROLE_LABELS[user?.role] || user?.role || "Tourist"}
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-zinc-600">{user?.email || "—"}</p>
                </div>
              </div>
              {user?.role === "tourist" && visibility.rewardsEnabled ? (
                <div className="min-w-0 max-w-xs sm:min-w-[10rem]">
                  {pointsLoading || pointsUserId !== user.id ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-zinc-500" role="status">
                      <Loader2 size={16} className="animate-spin" /> Loading points...
                    </p>
                  ) : pointsError ? (
                    <button type="button" className="text-xs font-bold text-red-600" onClick={() => refreshPoints()}>
                      Retry points
                    </button>
                  ) : (
                    <div>
                      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-700">
                        <Coins size={14} /> {formatPoints(points.balance)} pts
                      </p>
                      <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                        Placeholder balance only — points are not redeemable or connected to the main wallet.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPointsHistoryPage(1);
                          setPointsHistoryRetry((count) => count + 1);
                          setPointsHistoryOpen(true);
                          refreshPoints();
                        }}
                        className={`mt-2 ${portalShell.btnGhost}`}
                      >
                        <History size={14} /> View Points History
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            {user?.role !== "admin" ? (
              <p className="mt-4 text-xs font-bold text-zinc-600">
                Preferences: Email {user?.notification_channels?.email === false ? "off" : "on"}
                <span className="mx-2 text-zinc-300">·</span>
                SMS {user?.notification_channels?.sms === false ? "off" : "on"}
                <span className="mx-2 text-zinc-300">·</span>
                In-app {user?.notification_channels?.app === false ? "off" : "on"}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-zinc-100 pt-4">
              <Link href="/notifications" className="text-xs font-black uppercase tracking-widest text-blue-600 hover:underline">
                Notification inbox
              </Link>
              <Link href="/crisis/reports" className="text-xs font-black uppercase tracking-widest text-blue-600 hover:underline">
                My Reports
              </Link>
              <Link href="/how-to-use" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-blue-600 hover:underline">
                <BookOpen size={13} /> How to Use
              </Link>
            </div>
          </div>

          <ProfileFold
            title="Alerts"
            text="Manage email, SMS, in-app, and browser push notifications."
            open={openPanel === "alerts"}
            onToggle={() => setOpenPanel((current) => (current === "alerts" ? null : "alerts"))}
          >
          {user?.role !== "admin" ? (
            <PublicPanel title="Communication preferences" subtitle="Email, SMS, and in-app updates">
              <p className="text-sm text-zinc-500 font-medium mb-4">
                These preferences control your account updates. For crisis and area-hazard broadcasts, the Tourism Office selects channels for each alert; broadcast emails may be sent to eligible accounts with an email on file even when your Email preference is off. SMS and in-app broadcasts also require the matching preference to be on.
                {user?.notification_channels && !user.notification_channels.sms ? (
                  <span className="block mt-2 text-amber-700">
                    SMS is off. If it was paused after 30 days of inactivity, sign in and turn it back on here to resume text alerts.
                  </span>
                ) : null}
              </p>
              {channelMessage && (
                <div className={`mb-4 p-4 rounded-2xl text-sm font-medium ${
                  channelMessage.type === "success"
                    ? "bg-green-50 border border-green-100 text-green-800"
                    : "bg-red-50 border border-red-100 text-red-700"
                }`}>
                  {channelMessage.text}
                </div>
              )}
              <CommunicationChannelForm
                initialChannels={channelForm}
                onSave={handleChannelSave}
                saving={channelSaving}
              />
            </PublicPanel>
          ) : (
            <PublicPanel section="channels" title="Communication preferences" bodyClassName="bg-zinc-50/50">
              <p className="text-sm text-zinc-600 font-medium">
                Administrator accounts manage alerts in Command Center and do not receive tourist/guide SMS or email broadcasts.
              </p>
            </PublicPanel>
          )}

          <PublicPanel
            title={installedApp ? "Push alerts on this device" : "Browser and desktop push alerts"}
            subtitle="Optional system notifications, managed separately from in-app alerts"
          >
            <WebPushSettings />
          </PublicPanel>
          </ProfileFold>

          <ProfileFold
            title="Account"
            text="Name, phone, and nationality."
            open={openPanel === "account"}
            onToggle={() => setOpenPanel((current) => (current === "account" ? null : "account"))}
          >
            <PublicPanel title="Account details">
              {message && (
                <div className={`mb-6 flex items-start gap-3 rounded-2xl p-4 text-sm font-medium ${
                  message.type === "success"
                    ? "border border-green-100 bg-green-50 text-green-800"
                    : "border border-red-100 bg-red-50 text-red-700"
                }`}>
                  {message.type === "success" ? <CheckCircle size={18} className="mt-0.5 shrink-0" /> : null}
                  {message.text}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <User size={12} /> Full Name
                  </label>
                  <input
                    required
                    disabled={loading}
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className={`${portalShell.input} font-bold disabled:opacity-50`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <Mail size={12} /> Email
                  </label>
                  <input
                    readOnly
                    value={user?.email || ""}
                    className={`${portalShell.input} cursor-not-allowed bg-zinc-100 text-zinc-500`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <Phone size={12} /> Phone Number
                  </label>
                  <input
                    required
                    type="tel"
                    disabled={loading}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={`${portalShell.input} font-bold disabled:opacity-50`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <Globe size={12} /> Nationality
                  </label>
                  <select
                    required
                    disabled={loading}
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                    className={`${portalShell.select} w-full appearance-none disabled:opacity-50`}
                  >
                    <option value="Filipino">Filipino</option>
                    <option value="Foreigner">Foreigner</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <Shield size={12} /> Account Role
                  </label>
                  <input
                    readOnly
                    value={ROLE_LABELS[user?.role] || user?.role || "Tourist"}
                    className={`${portalShell.input} cursor-not-allowed bg-zinc-100 text-zinc-500`}
                  />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={loading} className={`w-full sm:w-auto ${portalShell.btnPrimary} disabled:opacity-50`}>
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save changes"}
                  </button>
                </div>
              </form>
            </PublicPanel>
          </ProfileFold>

          {user?.role !== "admin" ? (
            <ProfileFold
              title="Delete account"
              text="Permanent. Open this only if you want to leave."
              open={openPanel === "delete"}
              onToggle={() => setOpenPanel((current) => (current === "delete" ? null : "delete"))}
            >
            <PublicPanel title="Delete account" subtitle="Permanent — cannot be undone" bodyClassName="bg-red-50/20">
              <p className="text-sm text-zinc-600 font-medium mb-4 flex items-start gap-2">
                <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                <span>
                If you no longer want alerts from CONNECT-DAET, you can permanently delete your account.
                After 30 days without signing in, SMS may be paused automatically. Signing in does not turn it back on; re-enable SMS in Communication Preferences if you want text alerts.
                </span>
              </p>
              {deleteError && (
                <p className="text-sm text-red-600 font-medium mb-3">{deleteError}</p>
              )}
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || loading}
                className={portalShell.btnDanger}
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {deleting ? "Deleting..." : "Delete my account"}
              </button>
            </PublicPanel>
            </ProfileFold>
          ) : null}
          </>
        )}
      </PublicPageContent>

      {visibility.rewardsEnabled ? <PublicListModal
        open={pointsHistoryOpen}
        onClose={() => setPointsHistoryOpen(false)}
        title="Points history"
        subtitle={pointsHistoryIsCurrent ? `${pointsHistoryCount} point transactions` : "Loading your transaction history"}
      >
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium leading-relaxed text-amber-900">
        This is a placeholder balance only. Points are not redeemable and are not connected to the main wallet.
      </p>
      {pointsHistoryError ? (
          <ErrorState
            title="Could not load points history"
            message={pointsHistoryError}
            onRetry={refreshPoints}
          />
        ) : pointsHistoryLoading ? (
          <p role="status" className="flex items-center gap-2 text-sm font-medium text-zinc-500">
            <Loader2 size={16} className="animate-spin" /> Loading points history...
          </p>
        ) : pointsHistoryTransactions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm font-medium text-zinc-500">
            No point transactions have been recorded.
          </p>
        ) : (
          <div className="space-y-3">
            <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
              {pointsHistoryTransactions.map((transaction) => {
                const positive = BigInt(transaction.points_delta) > 0n;
                const statusTone = transaction.transaction_type === "earned"
                  ? "bg-emerald-50 text-emerald-700"
                  : transaction.transaction_type === "spent"
                    ? "bg-red-50 text-red-700"
                    : "bg-zinc-100 text-zinc-700";
                return (
                  <li key={transaction.id} className="flex items-start justify-between gap-3 p-3 sm:p-4">
                    <div className="min-w-0">
                      <p className="wrap-break-word text-sm font-bold text-zinc-900">
                        {getTransactionLabel(transaction)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${statusTone}`}>
                          {getTransactionStatus(transaction)}
                        </span>
                        <time className="text-[10px] font-medium text-zinc-500">
                          {new Date(transaction.created_at).toLocaleString()}
                        </time>
                      </div>
                      <p className="mt-1 text-[10px] font-medium text-zinc-400">
                        Balance after: {formatPoints(transaction.balance_after)} points
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-black tabular-nums ${positive ? "text-emerald-700" : "text-red-700"}`}>
                      {positive ? "+" : ""}{formatPoints(transaction.points_delta)}
                      <span className="ml-1 text-[10px] font-bold">pts</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {pointsHistoryCount > POINTS_HISTORY_PAGE_SIZE ? (
              <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                <p className="text-[10px] font-medium text-zinc-500">
                  Showing {(pointsHistoryPage - 1) * POINTS_HISTORY_PAGE_SIZE + 1}–{Math.min(pointsHistoryPage * POINTS_HISTORY_PAGE_SIZE, pointsHistoryCount)} of {pointsHistoryCount}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPointsHistoryPage((page) => Math.max(1, page - 1))}
                    disabled={pointsHistoryPage === 1}
                    className={portalShell.btnIcon}
                    aria-label="Previous points history page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-[10px] font-bold text-zinc-600">{pointsHistoryPage} / {pointsHistoryPages}</span>
                  <button
                    type="button"
                    onClick={() => setPointsHistoryPage((page) => Math.min(pointsHistoryPages, page + 1))}
                    disabled={pointsHistoryPage >= pointsHistoryPages}
                    className={portalShell.btnIcon}
                    aria-label="Next points history page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </PublicListModal> : null}

    </PublicPageShell>
  );
}
