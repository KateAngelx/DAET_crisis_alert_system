"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, Compass, Clock, ArrowRight } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { ActiveTouristsPanel } from "@/app/components/tour/ActiveTouristsPanel";
import { useAuthStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { iconSize, statGrid, typography } from "@/lib/designSystem";

export default function GuideActiveTouristsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { tourGroups, fetchTourGroups, fetchGroupPendingMembers, loading } = useGuideStore();

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [pendingAll, setPendingAll] = useState([]);

  const activeGroups = useMemo(
    () => tourGroups.filter((g) => g.status === "active"),
    [tourGroups]
  );
  const activeGroupIds = useMemo(
    () => activeGroups.map((g) => g.id).join(","),
    [activeGroups]
  );
  const selectedGroup = activeGroups.find((g) => g.id === selectedGroupId) || activeGroups[0] || null;

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

    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d2282c'},body:JSON.stringify({sessionId:'d2282c',location:'GuideActiveTouristsContent.js:loadPending',message:'Pending load effect ran',data:{activeGroupCount:activeGroups.length,activeGroupIds},timestamp:Date.now(),runId:'loop-fix',hypothesisId:'L1'})}).catch(()=>{});
    // #endregion

    return () => {
      cancelled = true;
    };
  }, [user?.id, activeGroupIds, fetchGroupPendingMembers]);

  const confirmedCount = activeGroups.reduce((sum, g) => sum + (g.member_count || 0), 0);

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title="Active Tourists"
        description="Find registered tourists, send assignment requests, and track pending confirmations for your tour groups."
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
          <DashboardStatCard label="Active Groups" value={activeGroups.length} icon={<Compass size={iconSize.stat} />} accent="purple" href="/guide/groups" hrefLabel="Manage" />
          <DashboardStatCard label="Confirmed Tourists" value={confirmedCount} icon={<Users size={iconSize.stat} />} accent="blue" />
          <DashboardStatCard label="Pending Requests" value={pendingAll.length} icon={<Clock size={iconSize.stat} />} accent="orange" />
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
              className="w-full sm:w-auto min-w-[240px] px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
            >
              {activeGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </Card>

          {user?.id && selectedGroup && (
            <ActiveTouristsPanel
              guideId={user.id}
              tourGroupId={selectedGroup.id}
              tourGroupName={selectedGroup.name}
            />
          )}

          {pendingAll.length > 0 && (
            <section>
              <h2 className={`${typography.sectionTitle} mb-4 flex items-center gap-2`}>
                <Clock size={16} /> All Pending Confirmations ({pendingAll.length})
              </h2>
              <div className="space-y-3">
                {pendingAll.map((assignment) => (
                  <Card key={assignment.id} className="p-4 border-orange-100 bg-orange-50/30">
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
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
