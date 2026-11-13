"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Compass, Plus, Users, Loader2, CheckCircle, X } from "lucide-react";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { guideShell } from "@/lib/designSystem";
import { DestinationModal } from "@/app/components/tour/DestinationModal";
import { ActiveTouristsPanel } from "@/app/components/tour/ActiveTouristsPanel";
import { TourGroupCard } from "@/app/components/tour/TourGroupCard";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { EmptyState } from "@/app/components/ui/AsyncState";
import { EMPTY_ROUTE_FORM } from "@/lib/tourGroupRoute";
import { GuideDashboardQuickActions } from "@/app/components/guide/GuideDashboardQuickActions";
import { ListPager } from "@/app/components/shell/ListPager";
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
  const [setupStep, setSetupStep] = useState("details");
  const [createdGroup, setCreatedGroup] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_ROUTE_FORM });
  const [modalGroup, setModalGroup] = useState(null);
  const [page, setPage] = useState(1);

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
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(displayedGroups.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleGroups = displayedGroups.slice((safePage - 1) * pageSize, safePage * pageSize);

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
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError("The end date must be on or after the tour date.");
      return;
    }
    if (form.end_time && !form.end_date) {
      setError("Choose an end date before setting an end time.");
      return;
    }
    if (!form.name.trim() || !form.starting_location.trim() || !form.destination.trim()) {
      setError("Group name, starting location, and destination are required.");
      return;
    }
    setSaving(true);
    try {
      const result = await createTourGroup({
        guideId: user.id,
        name: form.name.trim(),
        starting_location: form.starting_location.trim(),
        destination: form.destination.trim(),
        trip_info: form.trip_info.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        end_time: form.end_time || null,
        meeting_location: form.meeting_location.trim() || null,
        estimated_travel_time: form.estimated_travel_time.trim() || null,
        destination_notes: form.destination_notes.trim() || null,
      });
      if (result.success && result.group?.id) {
        setCreatedGroup(result.group);
        setSetupStep("invite");
        setTab("active");
        refreshGroups();
      } else {
        setError(result.error || "The group was created, but its details could not be loaded.");
      }
    } catch (createError) {
      setError(createError.message || "Failed to create tour group.");
    } finally {
      setSaving(false);
    }
  };

  const closeSetup = () => {
    setShowForm(false);
    setSetupStep("details");
    setCreatedGroup(null);
    setError(null);
    setForm({ ...EMPTY_ROUTE_FORM });
  };

  return (
    <>
      <GuidePageHeader
        title="Tour Groups"
        description="Create routes, assign tourists, and mark tours done when your group reaches the destination."
        action={
          <button
            type="button"
            onClick={() => {
              if (showForm) closeSetup();
              else {
                setError(null);
                setSetupStep("details");
                setCreatedGroup(null);
                setShowForm(true);
              }
            }}
            className={guideShell.btnGuide}
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
            onClick={() => {
              setTab(item.id);
              setPage(1);
            }}
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
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) closeSetup();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-group-setup-title"
            className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 bg-white px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">
                {setupStep === "details" ? "Step 1 of 2 · Group details" : "Step 2 of 2 · Invite tourists"}
              </p>
              <h2 id="tour-group-setup-title" className={`${typography.sectionTitle} mt-1 text-purple-700`}>
                {setupStep === "details" ? "Create Tour Group & Route" : `Invite tourists to ${createdGroup?.name || "your group"}`}
              </h2>
            </div>
            <button type="button" onClick={closeSetup} aria-label="Close tour group setup" disabled={saving} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50">
              <X size={20} />
            </button>
          </div>
          {setupStep === "details" ? (
            <div className="shrink-0 border-b border-zinc-100 bg-white px-5 py-3 sm:px-6">
              <button type="submit" form="tour-group-create-form" disabled={saving} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : "Create Tour Group"}
              </button>
            </div>
          ) : (
            <div className="flex shrink-0 flex-col-reverse gap-2 border-b border-zinc-100 bg-white px-5 py-3 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={closeSetup} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700">
                Skip for now
              </button>
              <button type="button" onClick={closeSetup} className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white hover:bg-purple-700">
                Done
              </button>
            </div>
          )}
          {setupStep === "details" ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {error && <p role="alert" className="text-sm text-red-600 font-medium mb-4">{error}</p>}
          <form id="tour-group-create-form" onSubmit={handleCreate} className="space-y-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Tour Date</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">End Date (optional)</label>
                <input type="date" min={form.start_date || undefined} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value, end_time: e.target.value ? form.end_time : "" })} className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">End Time (optional)</label>
                <input type="time" disabled={!form.end_date} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold disabled:cursor-not-allowed disabled:bg-zinc-100" />
                <p className="text-[10px] text-zinc-400">Daet local time (PHT). The guide is reminded about 1 hour before and when due.</p>
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
                <label className="text-[10px] font-black uppercase text-zinc-400">Meeting / Pickup Location (optional)</label>
                <input
                  value={form.meeting_location}
                  onChange={(e) => setForm({ ...form, meeting_location: e.target.value })}
                  placeholder="Where the group will meet"
                  className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Estimated Travel Time (optional)</label>
                <input
                  value={form.estimated_travel_time}
                  onChange={(e) => setForm({ ...form, estimated_travel_time: e.target.value })}
                  placeholder="e.g. 4 hours"
                  className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400">Important Destination Information (optional)</label>
              <textarea
                rows={2}
                value={form.destination_notes}
                onChange={(e) => setForm({ ...form, destination_notes: e.target.value })}
                placeholder="Safety reminders, what to bring, or other useful details"
                className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium"
              />
            </div>
          </form>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
              <p className="text-sm text-zinc-600">
                Search for registered tourists and send invitations. Tourists join the confirmed roster only after they accept. You can also skip this step and invite them later.
              </p>
              {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
              {createdGroup?.id && user?.id ? (
                <ActiveTouristsPanel
                  guideId={user.id}
                  tourGroupId={createdGroup.id}
                  tourGroupName={createdGroup.name}
                />
              ) : null}
            </div>
          )}
          </section>
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-zinc-50" />
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
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
          {visibleGroups.map((group) => (
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
      <ListPager page={safePage} pageCount={pageCount} onPage={setPage} />

      <GuideDashboardQuickActions showCompleted={false} />

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
    </>
  );
}
