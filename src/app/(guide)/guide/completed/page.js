"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { CheckCircle, Compass } from "lucide-react";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { CompletedToursPanel } from "@/app/components/tour/CompletedToursPanel";
import { useAuthStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { iconSize } from "@/lib/designSystem";

export default function GuideCompletedToursPage() {
  const { user } = useAuthStore();
  const { tourGroups, fetchTourGroups, loading } = useGuideStore();

  useEffect(() => {
    if (user?.id) fetchTourGroups(user.id);
  }, [user?.id, fetchTourGroups]);

  const activeGroups = useMemo(
    () => tourGroups.filter((g) => g.status === "active"),
    [tourGroups]
  );
  const completedGroups = useMemo(
    () => tourGroups.filter((g) => g.status === "completed"),
    [tourGroups]
  );

  return (
    <>
      <GuidePageHeader
        title="Completed Tours"
        description="Review finished tour groups, routes, and dates for your records."
        action={
          <Link
            href="/guide/groups"
            className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-purple-700 transition-colors"
          >
            <Compass size={16} /> Active groups
          </Link>
        }
      />

      {loading && tourGroups.length === 0 ? (
        <StatCardSkeletonGrid count={2} className="grid grid-cols-2 gap-2 sm:gap-3 max-w-md" />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-md">
          <DashboardStatCard
            compact
            label="Completed Tours"
            value={completedGroups.length}
            icon={<CheckCircle size={iconSize.stat} />}
            accent="green"
          />
          <DashboardStatCard
            compact
            label="In Progress"
            value={activeGroups.length}
            icon={<Compass size={iconSize.stat} />}
            accent="purple"
            href="/guide/groups"
            hrefLabel="Manage"
          />
        </div>
      )}

      <CompletedToursPanel groups={completedGroups} guideId={user?.id} loading={loading} />
    </>
  );
}
