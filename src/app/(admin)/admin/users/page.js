"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
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
import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { adminShell, iconSize, statGrid } from "@/lib/designSystem";
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
              className={adminShell.select}
            >
              <option value="Filipino">Filipino</option>
              <option value="Foreigner">Foreigner</option>
            </select>
            <select
              value={form.user_type}
              onChange={(e) => setForm({ ...form, user_type: e.target.value })}
              className={adminShell.select}
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
  const { confirm } = useConfirm();

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
    const ok = await confirm({
      title: "Save user changes?",
      description: `Update profile and role settings for ${user.full_name}. Active status and contact details will take effect immediately.`,
      confirmLabel: "Save changes",
      variant: "info",
    });
    if (!ok) return;
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
    const ok = await confirm({
      title: "Delete user permanently?",
      description: `This removes ${user.full_name} from the system and cannot be undone. Their reports and assignment history may remain for audit purposes.`,
      confirmLabel: "Delete user",
      variant: "danger",
    });
    if (!ok) return;
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
    <div className={!user.is_active ? "opacity-60" : undefined}>
      <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-50/90 transition-colors">
        <div className={`size-6 rounded-md flex items-center justify-center shrink-0 ${role.className}`}>
          <User size={12} />
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-black text-[10px] text-zinc-900 uppercase truncate">{user.full_name}</span>
            {online ? <span className="size-1.5 rounded-full bg-green-500 shrink-0" title="Online" /> : null}
            {isInactive ? (
              <span className="text-[8px] font-black uppercase text-amber-700 shrink-0">{inactiveDays}d</span>
            ) : null}
          </div>
          <p className="text-[9px] text-zinc-500 font-medium truncate">{user.email}</p>
        </div>
        <span className="hidden lg:block text-[8px] text-zinc-400 font-medium truncate max-w-[72px] shrink-0">
          {formatLastSeen(user.last_seen_at)}
        </span>
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`${adminShell.btnIcon} !p-1.5 !min-h-0`}
            aria-label={editing ? "Cancel edit" : "Edit user"}
          >
            <Pencil size={12} />
          </button>
          {!isSelf ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className={`${adminShell.btnIcon} !p-1.5 !min-h-0 text-red-600 hover:bg-red-50 disabled:opacity-50`}
              aria-label="Delete user"
            >
              <Trash2 size={12} />
            </button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="px-2 pb-2 pt-1 space-y-1.5 bg-zinc-50/80 border-t border-zinc-100">
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className={`${adminShell.input} !py-2 !text-xs`}
            placeholder="Full name"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={`${adminShell.input} !py-2 !text-xs`}
            placeholder="Phone"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              className={`${adminShell.select} !py-2 !text-xs`}
            >
              <option value="Filipino">Filipino</option>
              <option value="Foreigner">Foreigner</option>
            </select>
            <select
              value={form.user_type}
              onChange={(e) => setForm({ ...form, user_type: e.target.value })}
              className={`${adminShell.select} !py-2 !text-xs`}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-600">
            <input
              type="checkbox"
              checked={form.is_active}
              disabled={isSelf}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Active
          </label>
          {isSelf ? (
            <p className="text-[9px] text-amber-600 font-medium">You cannot deactivate your own account.</p>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`${adminShell.btnPrimary} !py-2 !text-[9px] w-full justify-center disabled:opacity-50`}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`px-2 pb-1 flex items-center gap-1 text-[9px] font-medium ${feedback.type === "success" ? "text-green-700" : "text-red-600"}`}
        >
          {feedback.type === "success" ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
          {feedback.text}
        </div>
      ) : null}
    </div>
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

  const usersByRole = useMemo(() => ({
    admin: allUsers.filter((u) => u.user_type === "admin"),
    guide: allUsers.filter((u) => u.user_type === "guide"),
    tourist: allUsers.filter((u) => !u.user_type || u.user_type === "tourist"),
  }), [allUsers]);

  useEffect(() => {
    if (loading) return;
  }, [loading, usersByRole.admin.length, usersByRole.guide.length, usersByRole.tourist.length]);

  return (
    <>
      <DashboardPageHeader
        title={ROLE_INTERFACE.admin.users.title}
        description={ROLE_INTERFACE.admin.users.description}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className={adminShell.btnPrimary}
            >
              <Plus size={14} /> Create User
            </button>
            <span className={`${adminShell.btnGhost} pointer-events-none`}>
              Total: {allUsers.length}
            </span>
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {[
            { key: "admin", title: "Admin accounts", users: usersByRole.admin },
            { key: "guide", title: "Guide accounts", users: usersByRole.guide },
            { key: "tourist", title: "Tourist accounts", users: usersByRole.tourist },
          ].map(({ key, title, users }) => (
            <AdminPanel
              key={key}
              title={title}
              subtitle={`${users.length} profile${users.length === 1 ? "" : "s"}`}
              noPadding
              bodyClassName="max-h-[min(720px,70vh)] overflow-y-auto overscroll-contain py-1"
            >
              {users.length === 0 ? (
                <p className="text-[10px] text-zinc-500 font-medium py-4 text-center px-3">No accounts in this column.</p>
              ) : (
                <ul className="divide-y divide-zinc-100/80">
                  {users.map((user) => (
                    <li key={user.id}>
                      <UserAdminCard
                        user={user}
                        currentUserId={currentUser?.id}
                        onChanged={refresh}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </AdminPanel>
          ))}
        </div>
      </AsyncState>

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={refresh} />
    </>
  );
}
