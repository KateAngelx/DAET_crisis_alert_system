"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, Compass, Clock, ArrowRight, UserPlus, UserCheck, Search } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { ActiveTouristsPanel } from "@/app/components/tour/ActiveTouristsPanel";
import { useAuthStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { GuideDashboardQuickActions } from "@/app/components/guide/GuideDashboardQuickActions";
import { ListPager } from "@/app/components/shell/ListPager";
import { iconSize, statGrid, typography } from "@/lib/designSystem";

export default function GuideActiveTouristsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { tourGroups, fetchTourGroups, fetchGroupMembers, fetchGroupPendingMembers, loading } = useGuideStore();

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [touristView, setTouristView] = useState("confirmed");
  const [confirmedMembers, setConfirmedMembers] = useState([]);
  const [confirmedSearch, setConfirmedSearch] = useState("");
  const [confirmedLoading, setConfirmedLoading] = useState(false);
  const [confirmedError, setConfirmedError] = useState("");
  const [pendingAll, setPendingAll] = useState([]);
  const [pendingPage, setPendingPage] = useState(1);

  const activeGroups = useMemo(
    () => tourGroups.filter((g) => g.status === "active"),
    [tourGroups]
  );
  const activeGroupIds = useMemo(
    () => activeGroups.map((g) => g.id).join(","),
    [activeGroups]
  );
  const selectedGroup = activeGroups.find((g) => g.id === selectedGroupId) || activeGroups[0] || null;
  const pendingPageSize = 5;
  const pendingPageCount = Math.max(1, Math.ceil(pendingAll.length / pendingPageSize));
  const safePendingPage = Math.min(pendingPage, pendingPageCount);
  const visiblePending = pendingAll.slice((safePendingPage - 1) * pendingPageSize, safePendingPage * pendingPageSize);
  const visibleConfirmedMembers = useMemo(() => {
    const query = confirmedSearch.trim().toLowerCase();
    if (!query) return confirmedMembers;
    return confirmedMembers.filter((assignment) => {
      const tourist = assignment.tourist || {};
      return [tourist.full_name, tourist.email, tourist.phone]
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [confirmedMembers, confirmedSearch]);

  useEffect(() => {
    if (user?.id) fetchTourGroups(user.id);
  }, [user?.id, fetchTourGroups]);

  useEffect(() => {
    const fromUrl = searchParams.get("group");
    if (fromUrl && activeGroups.some((g) => g.id === fromUrl)) {
      setSelectedGroupId((prev) => (prev === fromUrl ? prev : fromUrl));
      return;
    }
    if (activeGroups.length > 0) {
      setSelectedGroupId((prev) => prev || activeGroups[0].id);
    }
  }, [searchParams, activeGroupIds]);

  useEffect(() => {
    let cancelled = false;

    const loadConfirmedMembers = async () => {
      if (!user?.id || !selectedGroup?.id) {
        setConfirmedMembers([]);
        setConfirmedError("");
        setConfirmedLoading(false);
        return;
      }

      setConfirmedLoading(true);
      setConfirmedError("");
      try {
        const members = await fetchGroupMembers(selectedGroup.id, user.id);
        const fetchError = useGuideStore.getState().error;
        if (!cancelled) {
          setConfirmedMembers(members || []);
          setConfirmedError(fetchError || "");
        }
      } catch (error) {
        if (!cancelled) {
          setConfirmedError(error.message || "Unable to load confirmed tourists.");
          setConfirmedMembers([]);
        }
      } finally {
        if (!cancelled) setConfirmedLoading(false);
      }
    };

    loadConfirmedMembers();
    return () => {
      cancelled = true;
    };
  }, [user?.id, selectedGroup?.id, fetchGroupMembers]);

  useEffect(() => {
    let cancelled = false;

    const loadPending = async () => {
      if (!user?.id || activeGroups.length === 0) {
        if (!cancelled) setPendingAll([]);
        return;
      }

      const all = [];
      for (const group of activeGroups) {
        const pending = await fetchGroupPendingMembers(group.id, user.id);
        pending.forEach((p) => all.push({ ...p, tour_group: group }));
      }

      if (!cancelled) {
        setPendingAll((prev) => {
          const prevKey = prev.map((p) => p.id).join(",");
          const nextKey = all.map((p) => p.id).join(",");
          if (prevKey === nextKey) return prev;
          return all;
        });
      }
    };

    loadPending();


    return () => {
      cancelled = true;
    };
  }, [user?.id, activeGroupIds, fetchGroupPendingMembers]);

  const confirmedCount = activeGroups.reduce((sum, g) => sum + (g.member_count || 0), 0);

  return (
    <>
      <GuidePageHeader
        title="Active Tourists"
        description="View tourists who confirmed your tour group, or find registered tourists and invite them to join."
        action={
          <Link
            href="/guide/groups"
            className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-purple-700 transition-colors"
          >
            <Compass size={16} /> Tour Groups
          </Link>
        }
      />

      {loading && activeGroups.length === 0 ? (
        <StatCardSkeletonGrid count={3} className={statGrid.dashboardThree} />
      ) : (
        <div className={statGrid.dashboardThree}>
          <DashboardStatCard compact label="Active Groups" value={activeGroups.length} icon={<Compass size={iconSize.stat} />} accent="purple" href="/guide/groups" hrefLabel="Manage" />
          <DashboardStatCard compact label="Confirmed Tourists" value={confirmedCount} icon={<Users size={iconSize.stat} />} accent="blue" />
          <DashboardStatCard compact label="Pending Requests" value={pendingAll.length} icon={<Clock size={iconSize.stat} />} accent="orange" />
        </div>
      )}

      {activeGroups.length === 0 ? (
        <Card className="p-10 text-center border-zinc-100">
          <Compass size={40} className="mx-auto text-zinc-200 mb-3" />
          <p className="text-zinc-500 font-medium">Create a tour group before inviting tourists.</p>
          <Link href="/guide/groups" className="text-[10px] font-black uppercase text-blue-600 hover:underline mt-3 inline-block">
            Create Tour Group
          </Link>
        </Card>
      ) : (
        <>
          <Card className="p-4 border-zinc-100">
            <label className="text-[10px] font-black uppercase text-zinc-400 block mb-2">Select Tour Group</label>
            <select
              value={selectedGroup?.id || ""}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full sm:w-auto min-w-[240px] px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {activeGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </Card>

          <div className="flex flex-wrap gap-2" aria-label="Tourist management">
            <button
              type="button"
              aria-pressed={touristView === "confirmed"}
              onClick={() => setTouristView("confirmed")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide ${touristView === "confirmed" ? "bg-blue-600 text-white" : "border border-zinc-200 bg-white text-zinc-600"}`}
            >
              <UserCheck size={15} /> Confirmed tourists ({confirmedMembers.length})
            </button>
            <button
              type="button"
              aria-pressed={touristView === "invite"}
              onClick={() => setTouristView("invite")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide ${touristView === "invite" ? "bg-blue-600 text-white" : "border border-zinc-200 bg-white text-zinc-600"}`}
            >
              <UserPlus size={15} /> Find &amp; invite
            </button>
          </div>

          {touristView === "confirmed" ? (
            <section className="space-y-3">
              <h2 className={`${typography.sectionTitle} flex items-center gap-2`}>
                <UserCheck size={iconSize.section} /> Confirmed Tourists
                {selectedGroup ? <span className="text-sm font-medium text-zinc-500">· {selectedGroup.name}</span> : null}
              </h2>
              {confirmedLoading ? (
                <Card className="p-8 text-center text-sm text-zinc-400">Loading confirmed tourists…</Card>
              ) : confirmedError ? (
                <Card role="alert" className="p-8 text-center text-sm text-red-700">{confirmedError}</Card>
              ) : confirmedMembers.length === 0 ? (
                <Card className="p-8 text-center text-sm text-zinc-500">
                  No tourists have confirmed this tour group yet. Use “Find &amp; invite” to send an assignment request.
                </Card>
              ) : (
                <>
                  <label className="block">
                    <span className="sr-only">Search confirmed tourists</span>
                    <span className="relative block">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="search"
                        value={confirmedSearch}
                        onChange={(event) => setConfirmedSearch(event.target.value)}
                        placeholder="Search confirmed tourists..."
                        className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </span>
                  </label>
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <span>Tourist</span>
                      <span>Status</span>
                    </div>
                    {visibleConfirmedMembers.length ? (
                      <ul className="divide-y divide-zinc-100">
                        {visibleConfirmedMembers.map((assignment) => (
                          <li key={assignment.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-zinc-50/70">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-zinc-900">
                                {assignment.tourist?.full_name || "Tourist"}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-zinc-500">
                                {assignment.tourist?.email || assignment.tourist?.phone || "—"}
                              </span>
                            </span>
                            <span className="rounded-full bg-green-100 px-2 py-1 text-[9px] font-black uppercase text-green-700">
                              Confirmed
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-6 text-center text-sm text-zinc-500">No confirmed tourists match that search.</p>
                    )}
                  </div>
                </>
              )}
            </section>
          ) : user?.id && selectedGroup ? (
            <section>
              <ActiveTouristsPanel
                guideId={user.id}
                tourGroupId={selectedGroup.id}
                tourGroupName={selectedGroup.name}
              />
            </section>
          ) : null}

          {pendingAll.length > 0 && (
            <section>
              <h2 className={`${typography.sectionTitle} mb-4 flex items-center gap-2`}>
                <Clock size={16} /> All Pending Confirmations ({pendingAll.length})
              </h2>
              <div className="overflow-hidden rounded-xl border border-orange-100 bg-white divide-y divide-orange-100">
                {visiblePending.map((assignment) => (
                  <div key={assignment.id} className="flex flex-col gap-3 bg-orange-50/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-zinc-900">{assignment.tourist?.full_name}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Tour group: <strong>{assignment.tour_group?.name}</strong>
                        </p>
                        <p className="text-[10px] font-black uppercase text-orange-600 mt-1">Awaiting tourist confirmation</p>
                      </div>
                      <Link
                        href={`/guide/groups/${assignment.tour_group?.id}`}
                        className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1 shrink-0"
                      >
                        View Group <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <ListPager page={safePendingPage} pageCount={pendingPageCount} onPage={setPendingPage} />
            </section>
          )}
        </>
      )}

      <GuideDashboardQuickActions />
    </>
  );
}
