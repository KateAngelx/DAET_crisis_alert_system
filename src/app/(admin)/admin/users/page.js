"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";
import { User, Shield, Phone, Globe, Hash, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { StatCardSkeletonGrid, UserCardSkeletonList } from "@/app/components/ui/Skeletons";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { getRedirectForRole } from "@/lib/authGuard";
import { iconSize, statGrid } from "@/lib/designSystem";

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

function UserRoleControl({ user }) {
  const { updateUserRole } = useCrisisStore();
  const { user: currentUser, fetchProfile } = useAuthStore();
  const router = useRouter();
  const currentRole = user.user_type || "tourist";
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setSelectedRole(currentRole);
  }, [currentRole]);

  const hasChange = selectedRole !== currentRole;
  const isSelf = currentUser?.id === user.id;

  const handleUpdate = async () => {
    if (!hasChange) return;

    const roleLabel = ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label;
    const confirmMsg = isSelf
      ? `Change your own role to ${roleLabel}? You may lose admin access immediately.`
      : `Change ${user.full_name}'s role from ${ROLE_LABELS[currentRole]?.label} to ${roleLabel}?`;

    if (!window.confirm(confirmMsg)) return;

    setSaving(true);
    setFeedback(null);

    const result = await updateUserRole(user.id, selectedRole);
    setSaving(false);

    if (result.success) {
      setFeedback({ type: "success", text: `Role updated to ${roleLabel}.` });

      if (isSelf) {
        await fetchProfile();
        if (selectedRole !== "admin") {
          router.replace(getRedirectForRole(selectedRole));
        }
      }
    } else {
      setFeedback({ type: "error", text: result.error || "Failed to update role." });
      setSelectedRole(currentRole);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-zinc-100">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
        Role Assignment
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <select
          value={selectedRole}
          onChange={(e) => {
            setSelectedRole(e.target.value);
            setFeedback(null);
          }}
          disabled={saving}
          className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          aria-label={`Change role for ${user.full_name}`}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.value === currentRole ? " (current)" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={!hasChange || saving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving...
            </>
          ) : (
            "Update Role"
          )}
        </button>
      </div>
      {isSelf && hasChange && (
        <p className="text-[10px] text-amber-600 font-medium mt-2">
          You are changing your own role. Admin permissions will be removed if demoted.
        </p>
      )}
      {feedback && (
        <div
          className={`mt-2 flex items-center gap-2 text-xs font-medium ${
            feedback.type === "success" ? "text-green-700" : "text-red-600"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {feedback.text}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { allUsers, fetchAllUsers, loading } = useCrisisStore();

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const roleCounts = allUsers.reduce((acc, user) => {
    const type = user.user_type || "tourist";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title="User Management"
        description="View registered users and assign roles. New registrations default to Tourist; promote to Guide or Admin as needed."
        action={
          <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest">
            Total: {allUsers.length}
          </div>
        }
      />

      {loading ? (
        <StatCardSkeletonGrid count={3} className={statGrid.dashboardThree} />
      ) : (
        <div className={statGrid.dashboardThree}>
          <DashboardStatCard label="Tourists" value={roleCounts.tourist || 0} icon={<User size={iconSize.stat} />} accent="blue" />
          <DashboardStatCard label="Guides" value={roleCounts.guide || 0} icon={<Shield size={iconSize.stat} />} accent="purple" />
          <DashboardStatCard label="Admins" value={roleCounts.admin || 0} icon={<Shield size={iconSize.stat} />} accent="red" />
        </div>
      )}

      <AsyncState
        loading={loading}
        isEmpty={!loading && allUsers.length === 0}
        onRetry={fetchAllUsers}
        loadingFallback={<UserCardSkeletonList count={4} />}
        emptyFallback={
          <EmptyState icon={User} title="No users found" description="Registered users will appear here." />
        }
      >
        <div className="grid grid-cols-1 gap-4">
          {allUsers.map((user) => {
            const role = ROLE_LABELS[user.user_type] || ROLE_LABELS.tourist;
            return (
              <Card key={user.id} className="p-6 hover:shadow-md transition-all border-zinc-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${role.className}`}>
                      <User size={28} />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-zinc-900 uppercase tracking-tight leading-none mb-2">
                        {user.full_name}
                      </h3>
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
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <div className="flex items-center gap-2">
                    <Hash size={12} className="text-zinc-400" />
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{user.email}</p>
                  </div>
                </div>

                <UserRoleControl user={user} />
              </Card>
            );
          })}
        </div>
      </AsyncState>
    </div>
  );
}
