"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Compass, Plus, Users, Loader2, CheckCircle } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DestinationModal } from "@/app/components/tour/DestinationModal";
import { TourGroupCard } from "@/app/components/tour/TourGroupCard";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { EmptyState } from "@/app/components/ui/AsyncState";
import { EMPTY_ROUTE_FORM } from "@/lib/tourGroupRoute";
import { GuideDashboardQuickActions } from "@/app/components/guide/GuideDashboardQuickActions";
import { typography, iconSize, statGrid } from "@/lib/designSystem";

export default function GuideTourGroupsPage() {
  const { user } = useAuthStore();
  const { alerts, fetchAlerts } = useCrisisStore();
  const { advisories, fetchAdvisories } = useRouteAdvisoryStore();
  const {
    tourGroups,
    fetchTourGroups,
    createTourGroup,
    updateTourGroupRoute,
    fetchGroupMembers,
    groupMembers,
    loading,
  } = useGuideStore();

  const [tab, setTab] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_ROUTE_FORM });
  const [modalGroup, setModalGroup] = useState(null);

  useEffect(() => {
    if (user?.id) fetchTourGroups(user.id);
    fetchAlerts();
    fetchAdvisories();
  }, [user?.id, fetchTourGroups, fetchAlerts, fetchAdvisories]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("tab=completed")) {
      setTab("completed");
    }
  }, []);

  const activeGroups = useMemo(
    () => tourGroups.filter((g) => g.status === "active"),
    [tourGroups]
  );
  const completedGroups = useMemo(
    () => tourGroups.filter((g) => g.status === "completed"),
    [tourGroups]
  );
  const displayedGroups = tab === "completed" ? completedGroups : activeGroups;

  const activeTourists = activeGroups.reduce((s, g) => s + (g.member_count || 0), 0);

  const openDestination = async (group) => {
    setModalGroup(group);
    if (user?.id) await fetchGroupMembers(group.id, user.id);
  };

  const refreshGroups = () => {
    if (user?.id) fetchTourGroups(user.id);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.starting_location.trim() || !form.destination.trim()) {
      setError("Group name, starting location, and destination are required.");
      return;
    }
    setSaving(true);
    const result = await createTourGroup({
      guideId: user.id,
      name: form.name.trim(),
      starting_location: form.starting_location.trim(),
      destination: form.destination.trim(),
      trip_info: form.trip_info.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      meeting_location: form.meeting_location.trim() || null,
      estimated_travel_time: form.estimated_travel_time.trim() || null,
      destination_notes: form.destination_notes.trim() || null,
    });
    setSaving(false);
    if (result.success) {
      setForm({ ...EMPTY_ROUTE_FORM });
      setShowForm(false);
      setTab("active");
    } else {
      setError(result.error || "Failed to create tour group.");
    }
  };

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title="Tour Groups"
        description="Create routes, assign tourists, and mark tours done when your group reaches the destination."
        action={
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} /> {showForm ? "Cancel" : "New Tour Group"}
          </button>
        }
      />

      {loading && tourGroups.length === 0 ? (
        <StatCardSkeletonGrid count={3} className={statGrid.dashboardThree} />
      ) : (
        <div className={statGrid.dashboardThree}>
          <DashboardStatCard compact label="Active Groups" value={activeGroups.length} icon={<Compass size={iconSize.stat} />} accent="purple" />
          <DashboardStatCard compact label="Active Tourists" value={activeTourists} icon={<Users size={iconSize.stat} />} accent="blue" href="/guide/tourists" hrefLabel="Manage" />
          <DashboardStatCard compact label="Completed Tours" value={completedGroups.length} icon={<CheckCircle size={iconSize.stat} />} accent="green" href="/guide/completed" hrefLabel="View" />
        </div>
      )}

      <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl w-full sm:w-auto">
        {[
          { id: "active", label: "In Progress", count: activeGroups.length },
          { id: "completed", label: "Done", count: completedGroups.length },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === item.id
                ? "bg-white text-purple-700 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {showForm && (
        <Card className="p-5 sm:p-6 border-purple-100 bg-purple-50/30">
          <h2 className={`${typography.sectionTitle} text-purple-700 mb-4`}>Create Tour Group & Route</h2>
          {error && <p className="text-sm text-red-600 font-medium mb-4">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400">Tour Group Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Caramoan Adventure Group"
                className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">From (Starting Location)</label>
                <input
                  required
                  value={form.starting_location}
                  onChange={(e) => setForm({ ...form, starting_location: e.target.value })}
                  placeholder="e.g. Naga City"
                  className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">To (Destination)</label>
                <input
                  required
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  placeholder="e.g. Caramoan Islands"
                  className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Tour Date</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">End Date (optional)</label>
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400">Route / Travel Information</label>
              <textarea
                rows={2}
                value={form.trip_info}
                onChange={(e) => setForm({ ...form, trip_info: e.target.value })}
                placeholder="Transport mode, stops, schedule notes..."
                className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium"
              />
            </div>
            <button type="submit" disabled={saving} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : "Create Tour Group"}
            </button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 border-zinc-100 animate-pulse h-40" />
          ))}
        </div>
      ) : displayedGroups.length === 0 ? (
        <EmptyState
          icon={tab === "completed" ? CheckCircle : Compass}
          title={tab === "completed" ? "No completed tours yet" : "No active tour groups"}
          description={
            tab === "completed"
              ? "When you mark a tour as done, it will appear here for your records."
              : "Create a tour group with a route to start adding tourists."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedGroups.map((group) => (
            <TourGroupCard
              key={group.id}
              group={group}
              guideId={user?.id}
              onOpenDestination={tab === "active" ? openDestination : undefined}
              onCompleted={refreshGroups}
            />
          ))}
        </div>
      )}

      <GuideDashboardQuickActions className="mt-6" showCompleted={false} />

      <DestinationModal
        open={!!modalGroup}
        onClose={() => setModalGroup(null)}
        group={modalGroup}
        guide={user ? { full_name: user.name, phone: user.phone, email: user.email } : null}
        members={groupMembers}
        alerts={alerts}
        routeAdvisories={advisories}
        editable
        onSave={async (updates) => {
          const result = await updateTourGroupRoute(modalGroup.id, user.id, updates);
          if (result.success) {
            setModalGroup(result.group);
            refreshGroups();
          }
          return result;
        }}
      />
    </div>
  );
}
