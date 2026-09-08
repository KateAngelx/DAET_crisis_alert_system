"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Compass, MapPin, Users, Phone, Mail } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { DestinationButton, DestinationModal } from "@/app/components/tour/DestinationModal";
import { useGuideStore } from "@/app/store/guideStore";
import { useCrisisStore } from "@/app/store/crisisStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { EmptyState } from "@/app/components/ui/AsyncState";
import { formatTourRoute, getRelevantRouteAdvisoriesForGroup } from "@/lib/tourGroupRoute";
import { ASSIGNMENT_STATUS_LABELS } from "@/lib/assignmentStatus";
import { iconSize, statGrid } from "@/lib/designSystem";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  completed: "bg-zinc-100 text-zinc-600",
  cancelled: "bg-red-100 text-red-700",
};

const ASSIGNMENT_BADGE = {
  pending: "bg-orange-100 text-orange-700",
  active: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  removed: "bg-zinc-100 text-zinc-600",
};

export default function AdminGuideMonitoringPage() {
  const { tourGroups, assignments, fetchAllTourGroupsAdmin, fetchAllAssignmentsAdmin, loading } = useGuideStore();
  const { alerts, fetchAlerts } = useCrisisStore();
  const { advisories, fetchAdvisories } = useRouteAdvisoryStore();
  const [modalGroup, setModalGroup] = useState(null);

  useEffect(() => {
    fetchAllTourGroupsAdmin();
    fetchAllAssignmentsAdmin();
    fetchAlerts();
    fetchAdvisories();
  }, [fetchAllTourGroupsAdmin, fetchAllAssignmentsAdmin, fetchAlerts, fetchAdvisories]);

  const stats = useMemo(() => {
    const guides = new Map();
    let activeGroups = 0;
    let totalTourists = 0;

    tourGroups.forEach((group) => {
      if (group.status === "active") activeGroups += 1;
      const members = (group.guide_assignments || []).filter((a) => a.status === "active");
      totalTourists += members.length;

      if (group.guide?.id) {
        const existing = guides.get(group.guide.id) || {
          guide: group.guide,
          groups: [],
          touristCount: 0,
        };
        existing.groups.push({ ...group, activeMembers: members });
        existing.touristCount += members.length;
        guides.set(group.guide.id, existing);
      }
    });

    return {
      guideCount: guides.size,
      activeGroups,
      totalTourists,
      guides: Array.from(guides.values()),
    };
  }, [tourGroups]);

  const tableRows = useMemo(
    () =>
      tourGroups.map((group) => ({
        ...group,
        activeMembers: (group.guide_assignments || []).filter((a) => a.status === "active"),
      })),
    [tourGroups]
  );

  const openDestination = (group) => setModalGroup(group);

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title="Tour Group Management"
        description="Administrative oversight of tour groups, routes, guides, and tourist assignments."
      />

      {loading ? (
        <StatCardSkeletonGrid count={3} className={statGrid.dashboardThree} />
      ) : (
        <div className={statGrid.dashboardThree}>
          <DashboardStatCard compact label="Guides with Groups" value={stats.guideCount} icon={<Users size={iconSize.stat} />} accent="purple" />
          <DashboardStatCard compact label="Active Tour Groups" value={stats.activeGroups} icon={<Compass size={iconSize.stat} />} accent="blue" />
          <DashboardStatCard compact label="Assigned Tourists" value={stats.totalTourists} icon={<Users size={iconSize.stat} />} accent="green" />
        </div>
      )}

      {loading ? (
        <Card className="p-6 h-48 animate-pulse bg-zinc-50" />
      ) : tourGroups.length === 0 ? (
        <EmptyState icon={Compass} title="No tour groups" description="Tour groups created by guides will appear here for monitoring." />
      ) : (
        <>
          <Card className="border-zinc-100 overflow-hidden mb-6">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Assignment Relationships</h2>
              <p className="text-xs text-zinc-500 mt-1">Tourist → Guide → Tour Group → Destination</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <th className="p-4">Tourist</th>
                    <th className="p-4">Guide</th>
                    <th className="p-4">Tour Group</th>
                    <th className="p-4">Route</th>
                    <th className="p-4">Route Status</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-400">No assignment records yet.</td>
                    </tr>
                  ) : (
                    assignments.slice(0, 50).map((a) => (
                      <tr key={a.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="p-4 font-medium text-zinc-900">{a.tourist?.full_name || "—"}</td>
                        <td className="p-4 text-zinc-700">{a.guide?.full_name || "—"}</td>
                        <td className="p-4 text-zinc-700">{a.tour_group?.name || "—"}</td>
                        <td className="p-4 text-blue-600 text-xs font-medium">{formatTourRoute(a.tour_group)}</td>
                        <td className="p-4">
                          {(() => {
                            const ra = getRelevantRouteAdvisoriesForGroup(advisories, a.tour_group);
                            if (ra.length === 0) {
                              return <span className="text-[9px] font-black uppercase text-green-600">Clear</span>;
                            }
                            return (
                              <span className="text-[9px] font-black uppercase text-orange-700">
                                {ra.length} advis{ra.length > 1 ? "ories" : "ory"}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${ASSIGNMENT_BADGE[a.status] || "bg-zinc-100 text-zinc-600"}`}>
                            {ASSIGNMENT_STATUS_LABELS[a.status] || a.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {a.tour_group && (
                            <DestinationButton onClick={() => setModalGroup({ ...a.tour_group, guide: a.guide, guide_assignments: [{ tourist: a.tourist, status: a.status }] })} />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="border-zinc-100 overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">All Tour Groups</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <th className="p-4">Tour Group</th>
                    <th className="p-4">Guide</th>
                    <th className="p-4">From</th>
                    <th className="p-4">Destination</th>
                    <th className="p-4">Route Status</th>
                    <th className="p-4 text-center">Tourists</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((group) => (
                    <tr key={group.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                      <td className="p-4 font-bold text-zinc-900">{group.name}</td>
                      <td className="p-4 text-zinc-700">{group.guide?.full_name || "—"}</td>
                      <td className="p-4 text-zinc-600">{group.starting_location || "—"}</td>
                      <td className="p-4 text-zinc-600">{group.destination}</td>
                      <td className="p-4">
                        {(() => {
                          const ra = getRelevantRouteAdvisoriesForGroup(advisories, group);
                          if (ra.length === 0) {
                            return <span className="text-[9px] font-black uppercase text-green-600">Clear</span>;
                          }
                          return (
                            <span className="text-[9px] font-black uppercase text-orange-700">
                              {ra.length} advis{ra.length > 1 ? "ories" : "ory"}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-center font-black text-blue-600">{group.activeMembers.length}</td>
                      <td className="p-4">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[group.status]}`}>
                          {group.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <DestinationButton onClick={() => openDestination(group)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">By Guide</h2>
            {stats.guides.map(({ guide, groups, touristCount }) => (
              <Card key={guide.id} className="p-6 border-zinc-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-zinc-100">
                  <div>
                    <h3 className="font-black text-lg text-zinc-900 uppercase tracking-tight">{guide.full_name}</h3>
                    <div className="flex flex-wrap gap-4 mt-1 text-xs text-zinc-500 font-bold">
                      {guide.email && <span className="flex items-center gap-1"><Mail size={12} /> {guide.email}</span>}
                      {guide.phone && <span className="flex items-center gap-1"><Phone size={12} /> {guide.phone}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-blue-600">{touristCount}</p>
                    <p className="text-[10px] font-black uppercase text-zinc-400">Tourists Assigned</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between gap-4 p-3 bg-zinc-50 rounded-xl">
                      <div>
                        <p className="font-bold text-zinc-900">{group.name}</p>
                        <p className="text-xs text-blue-600 font-medium">{formatTourRoute(group)}</p>
                      </div>
                      <DestinationButton onClick={() => openDestination(group)} />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <DestinationModal
        open={!!modalGroup}
        onClose={() => setModalGroup(null)}
        group={modalGroup}
        guide={modalGroup?.guide}
        members={(modalGroup?.guide_assignments || [])
          .filter((a) => a.status === "active")
          .map((a) => ({ id: a.id, tourist: a.tourist }))}
        alerts={alerts}
        routeAdvisories={advisories}
        editable={false}
      />
    </div>
  );
}
