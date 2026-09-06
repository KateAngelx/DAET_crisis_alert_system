"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { User, Mail, Phone, Globe, Shield, Loader2, CheckCircle, Compass, MapPin, Navigation, Trash2, AlertTriangle } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DestinationModal } from "@/app/components/tour/DestinationModal";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { InfoPageHero, PublicPageShell, PublicPageContent } from "@/app/components/InfoPageHero";
import { CommunicationChannelForm } from "@/app/components/CommunicationChannelSetup";
import { ProfileSkeleton } from "@/app/components/ui/Skeletons";
import { ErrorState } from "@/app/components/ui/AsyncState";
import { formatTourRoute } from "@/lib/tourGroupRoute";

const ROLE_LABELS = {
  tourist: "Tourist",
  guide: "Tourism Guide",
  admin: "Administrator",
};

export default function ProfilePage() {
  const { user, isAuthenticated, loading, fetchProfile, updateProfile, updateNotificationChannels, deleteAccount } = useAuthStore();
  const { alerts, fetchAlerts } = useCrisisStore();
  const { touristActiveGroup, fetchTouristActiveGroup } = useGuideStore();
  const [form, setForm] = useState({ full_name: "", phone: "", nationality: "Filipino" });
  const [channelForm, setChannelForm] = useState({ email: true, sms: true, app: true });
  const [channelSaving, setChannelSaving] = useState(false);
  const [channelMessage, setChannelMessage] = useState(null);
  const [message, setMessage] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showDestination, setShowDestination] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

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
    if (isAuthenticated && user?.id && user?.role === "tourist") {
      fetchTouristActiveGroup(user.id);
    }
  }, [isAuthenticated, user?.id, user?.role, fetchTouristActiveGroup]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

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
      setMessage({ type: "success", text: "Profile updated successfully." });
    } else {
      setMessage({ type: "error", text: result.error || "Failed to update profile." });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    const confirmed = window.confirm(
      "Permanently delete your account? You will stop receiving all alerts and cannot undo this action."
    );
    if (!confirmed) return;

    const typed = window.prompt('Type DELETE to confirm account removal:');
    if (typed !== "DELETE") return;

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
        <PublicPageContent className="text-center">
          <p className="text-zinc-500 mb-4 text-sm font-medium">Sign in to view and edit your profile.</p>
          <Link href="/login" className="text-blue-600 font-bold uppercase text-xs">Sign In</Link>
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

      <PublicPageContent>
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
          {user?.role === "tourist" && touristActiveGroup?.tour_group && (
            <Card className="p-6 mb-6 border-purple-100 bg-purple-50/30 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-widest text-purple-700 mb-2 flex items-center gap-2">
                <Compass size={16} /> My Tour
              </h2>
              <p className="text-xs text-purple-600 font-bold mb-4">
                You are currently assigned to this tour group and guide.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-white rounded-2xl border border-purple-100">
                  <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">My Guide</p>
                  <p className="font-bold text-zinc-900 text-lg">{touristActiveGroup.guide?.full_name || "—"}</p>
                  {touristActiveGroup.guide?.phone && (
                    <p className="text-xs text-zinc-500 mt-1">{touristActiveGroup.guide.phone}</p>
                  )}
                </div>
                <div className="p-4 bg-white rounded-2xl border border-purple-100">
                  <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">My Tour Group</p>
                  <p className="font-bold text-zinc-900 text-lg">{touristActiveGroup.tour_group.name}</p>
                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-green-100 text-green-700 mt-2 inline-block">
                    {touristActiveGroup.tour_group.status}
                  </span>
                </div>
                <div className="md:col-span-2 p-4 bg-white rounded-2xl border border-purple-100">
                  <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Route</p>
                  <p className="font-bold text-blue-600 flex items-center gap-2 text-base">
                    <Navigation size={16} /> {formatTourRoute(touristActiveGroup.tour_group)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDestination(true)}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-colors"
              >
                <MapPin size={14} /> View Destination
              </button>
            </Card>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6 bg-zinc-50 border border-zinc-200 rounded-3xl lg:col-span-1">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-blue-600 p-3 rounded-2xl text-white">
                  <User size={24} />
                </div>
                <div>
                  <p className="font-black text-zinc-900 uppercase tracking-tight">{user?.name}</p>
                  <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mt-0.5">
                    {ROLE_LABELS[user?.role] || user?.role || "Tourist"}
                  </p>
                </div>
              </div>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Email</dt>
                  <dd className="font-medium text-zinc-700 break-all">{user?.email || "—"}</dd>
                </div>
                {user?.created_at && (
                  <div>
                    <dt className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Member Since</dt>
                    <dd className="font-medium text-zinc-700">
                      {new Date(user.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-6 pt-6 border-t border-zinc-200 space-y-2">
                <Link href="/notifications" className="block text-xs font-black uppercase text-blue-600 tracking-widest hover:underline">
                  Notifications
                </Link>
                <Link href="/crisis/reports" className="block text-xs font-black uppercase text-blue-600 tracking-widest hover:underline">
                  My Reports
                </Link>
              </div>
            </Card>

            <Card className="p-6 rounded-3xl lg:col-span-2">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 mb-4">Account Details</h2>

              {message && (
                <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 text-sm font-medium ${
                  message.type === "success"
                    ? "bg-green-50 border border-green-100 text-green-800"
                    : "bg-red-50 border border-red-100 text-red-700"
                }`}>
                  {message.type === "success" ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : null}
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <User size={12} /> Full Name
                  </label>
                  <input
                    required
                    disabled={loading}
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Mail size={12} /> Email
                  </label>
                  <input
                    readOnly
                    value={user?.email || ""}
                    className="w-full p-4 bg-zinc-100 border border-zinc-100 rounded-2xl font-bold text-sm text-zinc-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Phone size={12} /> Phone Number
                  </label>
                  <input
                    required
                    type="tel"
                    disabled={loading}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Globe size={12} /> Nationality
                  </label>
                  <select
                    required
                    disabled={loading}
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 appearance-none disabled:opacity-50"
                  >
                    <option value="Filipino">Filipino</option>
                    <option value="Foreigner">Foreigner</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Shield size={12} /> Account Role
                  </label>
                  <input
                    readOnly
                    value={ROLE_LABELS[user?.role] || user?.role || "Tourist"}
                    className="w-full p-4 bg-zinc-100 border border-zinc-100 rounded-2xl font-bold text-sm text-zinc-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-zinc-400 font-medium mt-1">
                    Role changes are managed by Daet LGU administrators.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Changes"}
                  </button>
                </div>
              </form>
            </Card>
          </div>

          {user?.role !== "admin" ? (
            <Card className="p-6 rounded-3xl mt-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 mb-2">Communication Preferences</h2>
              <p className="text-sm text-zinc-500 font-medium mb-4">
                Control how you receive crisis alerts and updates. Disabled channels will not receive notifications.
                {user?.notification_channels && !user.notification_channels.sms ? (
                  <span className="block mt-2 text-amber-700">
                    SMS is currently off. Sign in regularly and re-enable SMS here to receive text alerts again.
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
            </Card>
          ) : (
            <Card className="p-6 rounded-3xl mt-6 bg-zinc-50 border-zinc-200">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 mb-2">Communication Preferences</h2>
              <p className="text-sm text-zinc-600 font-medium">
                Administrator accounts manage alerts in Command Center and do not receive tourist/guide SMS or email broadcasts.
              </p>
            </Card>
          )}

          {user?.role !== "admin" ? (
            <Card className="p-6 rounded-3xl mt-6 border-red-100 bg-red-50/20">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 mb-2 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-600" /> Delete Account
              </h2>
              <p className="text-sm text-zinc-600 font-medium mb-4">
                If you no longer want alerts from CONNECT-DAET, you can permanently delete your account.
                Inactive accounts (30+ days without signing in) have SMS paused automatically until you sign in again.
              </p>
              {deleteError && (
                <p className="text-sm text-red-600 font-medium mb-3">{deleteError}</p>
              )}
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {deleting ? "Deleting..." : "Delete My Account"}
              </button>
            </Card>
          ) : null}
          </>
        )}
      </PublicPageContent>

      {user?.role === "tourist" && touristActiveGroup?.tour_group && (
        <DestinationModal
          open={showDestination}
          onClose={() => setShowDestination(false)}
          group={touristActiveGroup.tour_group}
          guide={touristActiveGroup.guide}
          members={[{ id: user.id, tourist: { full_name: user.name, nationality: user.nationality } }]}
          alerts={alerts}
          editable={false}
        />
      )}
    </PublicPageShell>
  );
}
