"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, MapPin, Plus, Users, ArrowRight, Loader2, Navigation } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DestinationButton, DestinationModal } from "@/app/components/tour/DestinationModal";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { EmptyState } from "@/app/components/ui/AsyncState";
import { formatTourRoute, EMPTY_ROUTE_FORM } from "@/lib/tourGroupRoute";
import { typography, iconSize, statCard } from "@/lib/designSystem";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  completed: "bg-zinc-100 text-zinc-600",
  cancelled: "bg-red-100 text-red-700",
};

export default function GuideTourGroupsPage() {
  const { user } = useAuthStore();
  const { alerts, fetchAlerts } = useCrisisStore();
  const {
    tourGroups,
    fetchTourGroups,
    createTourGroup,
    updateTourGroupRoute,
    fetchGroupMembers,
    groupMembers,
    loading,
  } = useGuideStore();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_ROUTE_FORM });
  const [modalGroup, setModalGroup] = useState(null);

  useEffect(() => {
    if (user?.id) fetchTourGroups(user.id);
    fetchAlerts();
  }, [user?.id, fetchTourGroups, fetchAlerts]);

  const openDestination = async (group) => {
    setModalGroup(group);
    if (user?.id) await fetchGroupMembers(group.id, user.id);
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
    } else {
      setError(result.error || "Failed to create tour group.");
    }
  };

  const activeCount = tourGroups.filter((g) => g.status === "active").length;
  const totalMembers = tourGroups.reduce((s, g) => s + (g.member_count || 0), 0);

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title="Tour Groups"
        description="Create tour groups with a defined route (From → To), tour date, and travel details. Add registered tourists to each group."
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
        <StatCardSkeletonGrid count={2} className="grid grid-cols-2 gap-3 sm:gap-4" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className={`${statCard.dashboard} border-zinc-100 min-w-0`}>
            <p className={`${typography.statLabel} text-zinc-400 mb-1`}>Active Groups</p>
            <p className={`${typography.statValue} text-purple-600`}>{activeCount}</p>
          </Card>
          <Card className={`${statCard.dashboard} border-zinc-100 min-w-0`}>
            <p className={`${typography.statLabel} text-zinc-400 mb-1`}>Total Tourists</p>
            <p className={`${typography.statValue} text-blue-600`}>{totalMembers}</p>
          </Card>
        </div>
      )}

      {showForm && (
        <Card className="p-6 border-purple-100 bg-purple-50/30">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Meeting / Pickup Location</label>
                <input value={form.meeting_location} onChange={(e) => setForm({ ...form, meeting_location: e.target.value })} placeholder="e.g. SM City Naga terminal" className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Estimated Travel Time</label>
                <input value={form.estimated_travel_time} onChange={(e) => setForm({ ...form, estimated_travel_time: e.target.value })} placeholder="e.g. 4 hours" className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400">Important Destination Information</label>
              <textarea rows={2} value={form.destination_notes} onChange={(e) => setForm({ ...form, destination_notes: e.target.value })} placeholder="Safety tips, what to bring, local rules..." className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium" />
            </div>
            <button type="submit" disabled={saving} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : "Create Tour Group"}
            </button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 border-zinc-100 animate-pulse h-32" />
          ))}
        </div>
      ) : tourGroups.length === 0 ? (
        <EmptyState icon={Compass} title="No tour groups" description="Create a tour group with a route to start adding tourists." />
      ) : (
        <div className="space-y-4">
          {tourGroups.map((group) => (
            <Card key={group.id} className="p-6 border-zinc-100 hover:shadow-md transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="p-3 bg-purple-100 rounded-2xl shrink-0">
                    <Compass size={iconSize.stat} className="text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-black text-zinc-900 uppercase tracking-tight">{group.name}</h3>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[group.status] || STATUS_STYLES.active}`}>
                        {group.status}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-blue-600 flex items-center gap-1">
                      <Navigation size={12} /> {formatTourRoute(group)}
                    </p>
                    {group.trip_info && (
                      <p className="text-sm text-zinc-600 mt-2 line-clamp-2">{group.trip_info}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-2xl font-black text-blue-600">{group.member_count || 0}</p>
                    <p className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1 justify-end">
                      <Users size={12} /> Tourists
                    </p>
                  </div>
                  <DestinationButton onClick={() => openDestination(group)} />
                  <Link href={`/guide/groups/${group.id}`} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                    <ArrowRight size={18} className="text-zinc-400" />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DestinationModal
        open={!!modalGroup}
        onClose={() => setModalGroup(null)}
        group={modalGroup}
        guide={user ? { full_name: user.name, phone: user.phone, email: user.email } : null}
        members={groupMembers}
        alerts={alerts}
        editable
        onSave={async (updates) => {
          const result = await updateTourGroupRoute(modalGroup.id, user.id, updates);
          if (result.success) setModalGroup(result.group);
          return result;
        }}
      />
    </div>
  );
}
