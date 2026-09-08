"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Phone,
  Globe,
  Hash,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Clock,
  Wifi,
  UserX,
  Pencil,
  X,
} from "lucide-react";
import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { StatCardSkeletonGrid, UserCardSkeletonList } from "@/app/components/ui/Skeletons";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { getRedirectForRole } from "@/lib/authGuard";
import { iconSize, statGrid } from "@/lib/designSystem";
import {
  getInactiveDays,
  isUserOnline,
  INACTIVE_THRESHOLD_DAYS,
} from "@/lib/userActivity";

const ROLE_OPTIONS = [
  { value: "tourist", label: "Tourist" },
  { value: "guide", label: "Guide" },
  { value: "admin", label: "Admin" },
];

const ROLE_LABELS = {
  tourist: { label: "Tourist", className: "bg-blue-100 text-blue-600" },
  guide: { label: "Guide", className: "bg-purple-100 text-purple-600" },
  admin: { label: "Admin", className: "bg-red-100 text-red-600" },
};

function formatLastSeen(ts) {
  if (!ts) return "Never";
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function CreateUserModal({ open, onClose, onCreated }) {
  const { createUser } = useCrisisStore();
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    nationality: "Filipino",
    user_type: "tourist",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createUser(form);
    setSaving(false);
    if (result.success) {
      onCreated?.();
      onClose();
      setForm({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        nationality: "Filipino",
        user_type: "tourist",
      });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black uppercase tracking-tight">Create User</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
          />
          <input
            required
            type="password"
            minLength={6}
            placeholder="Temporary password (min 6 chars)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
          />
          <input
            required
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
            >
              <option value="Filipino">Filipino</option>
              <option value="Foreigner">Foreigner</option>
            </select>
            <select
              value={form.user_type}
              onChange={(e) => setForm({ ...form, user_type: e.target.value })}
              className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create User"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function UserAdminCard({ user, currentUserId, onChanged }) {
  const { updateUser, deleteUser } = useCrisisStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: user.full_name || "",
    phone: user.phone || "",
    nationality: user.nationality || "Filipino",
    user_type: user.user_type || "tourist",
    is_active: user.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isSelf = currentUserId === user.id;
  const role = ROLE_LABELS[user.user_type] || ROLE_LABELS.tourist;
  const online = isUserOnline(user);
  const inactiveDays = getInactiveDays(user);
  const isInactive = inactiveDays !== null && inactiveDays >= INACTIVE_THRESHOLD_DAYS;

  useEffect(() => {
    setForm({
      full_name: user.full_name || "",
      phone: user.phone || "",
      nationality: user.nationality || "Filipino",
      user_type: user.user_type || "tourist",
      is_active: user.is_active !== false,
    });
  }, [user]);

  const handleSave = async () => {
    if (!window.confirm(`Save changes for ${user.full_name}?`)) return;
    setSaving(true);
    setFeedback(null);
    const result = await updateUser(user.id, form);
    setSaving(false);
    if (result.success) {
      setFeedback({ type: "success", text: "User updated." });
      setEditing(false);
      onChanged?.();
      if (isSelf && form.user_type !== "admin") {
        router.replace(getRedirectForRole(form.user_type));
      }
    } else {
      setFeedback({ type: "error", text: result.error });
    }
  };

  const handleDelete = async () => {
    if (isSelf) return;
    if (!window.confirm(`Permanently delete ${user.full_name}? This cannot be undone.`)) return;
    setSaving(true);
    const result = await deleteUser(user.id);
    setSaving(false);
    if (result.success) {
      onChanged?.();
    } else {
      setFeedback({ type: "error", text: result.error });
    }
  };

  return (
    <Card className={`p-6 hover:shadow-md transition-all border-zinc-100 ${!user.is_active ? "opacity-70" : ""}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-2xl ${role.className}`}>
            <User size={28} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-black text-xl text-zinc-900 uppercase tracking-tight leading-none">
                {user.full_name}
              </h3>
              {online ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <Wifi size={10} /> Online
                </span>
              ) : null}
              {isInactive ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  <UserX size={10} /> {inactiveDays}d inactive
                </span>
              ) : null}
              {user.sms_suspended_at ? (
                <span className="text-[10px] font-black uppercase text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                  SMS paused
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase text-zinc-400 tracking-widest">
                <Shield size={14} className="text-blue-500" />
                {role.label}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500">
                <Phone size={14} className="text-zinc-400" /> {user.phone || "No Contact"}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500">
                <Globe size={14} className="text-zinc-400" /> {user.nationality || "—"}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500">
                <Clock size={14} className="text-zinc-400" /> Last seen {formatLastSeen(user.last_seen_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-1"
          >
            <Pencil size={12} /> {editing ? "Cancel" : "Edit"}
          </button>
          {!isSelf ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 size={12} /> Delete
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
        <div className="flex items-center gap-2">
          <Hash size={12} className="text-zinc-400" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{user.email}</p>
        </div>
        <p className="text-[10px] text-zinc-400 mt-2 font-medium">
          Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
          {user.last_login_at ? ` · Last login ${formatLastSeen(user.last_login_at)}` : ""}
          {inactiveDays !== null ? ` · ${inactiveDays} days since activity` : ""}
        </p>
      </div>

      {editing ? (
        <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3">
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
            placeholder="Full name"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
            placeholder="Phone"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
            >
              <option value="Filipino">Filipino</option>
              <option value="Foreigner">Foreigner</option>
            </select>
            <select
              value={form.user_type}
              onChange={(e) => setForm({ ...form, user_type: e.target.value })}
              className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-zinc-600">
            <input
              type="checkbox"
              checked={form.is_active}
              disabled={isSelf}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Account active (can receive broadcasts)
          </label>
          {isSelf && (
            <p className="text-[10px] text-amber-600 font-medium">You cannot deactivate your own account.</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      ) : null}

      {feedback && (
        <div className={`mt-3 flex items-center gap-2 text-xs font-medium ${feedback.type === "success" ? "text-green-700" : "text-red-600"}`}>
          {feedback.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {feedback.text}
        </div>
      )}
    </Card>
  );
}

export default function AdminUsersPage() {
  const { allUsers, userStats, fetchAllUsers, fetchUserStats, loading } = useCrisisStore();
  const { user: currentUser } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);

  const refresh = () => {
    fetchAllUsers();
    fetchUserStats();
  };

  useEffect(() => {
    refresh();
  }, [fetchAllUsers, fetchUserStats]);

  const roleCounts = useMemo(() => {
    return allUsers.reduce((acc, u) => {
      const type = u.user_type || "tourist";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }, [allUsers]);

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title={ROLE_INTERFACE.admin.users.title}
        description={ROLE_INTERFACE.admin.users.description}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Plus size={14} /> Create User
            </button>
            <div className="bg-zinc-900 text-white px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest">
              Total: {allUsers.length}
            </div>
          </div>
        }
      />
      <RoleContextBanner helper={ROLE_INTERFACE.admin.users.helper} tone="info" />

      {loading ? (
        <StatCardSkeletonGrid count={5} className={statGrid.dashboardFive} />
      ) : (
        <div className={statGrid.dashboardFive}>
          <DashboardStatCard compact label="Tourists" value={roleCounts.tourist || 0} icon={<User size={iconSize.stat} />} accent="blue" />
          <DashboardStatCard compact label="Guides" value={roleCounts.guide || 0} icon={<Shield size={iconSize.stat} />} accent="purple" />
          <DashboardStatCard compact label="Admins" value={roleCounts.admin || 0} icon={<Shield size={iconSize.stat} />} accent="red" />
          <DashboardStatCard compact label="Online" value={userStats?.onlineCount ?? 0} icon={<Wifi size={iconSize.stat} />} accent="green" />
          <DashboardStatCard compact label="Inactive 30d+" value={userStats?.inactiveOver30Days ?? 0} icon={<UserX size={iconSize.stat} />} accent="orange" />
        </div>
      )}

      <AsyncState
        loading={loading}
        isEmpty={!loading && allUsers.length === 0}
        onRetry={refresh}
        loadingFallback={<UserCardSkeletonList count={4} />}
        emptyFallback={
          <EmptyState icon={User} title="No users found" description="Registered users will appear here." />
        }
      >
        <div className="grid grid-cols-1 gap-4">
          {allUsers.map((user) => (
            <UserAdminCard
              key={user.id}
              user={user}
              currentUserId={currentUser?.id}
              onChanged={refresh}
            />
          ))}
        </div>
      </AsyncState>

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={refresh} />
    </div>
  );
}
