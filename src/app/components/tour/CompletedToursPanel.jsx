"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Compass } from "lucide-react";
import { TourGroupCard } from "@/app/components/tour/TourGroupCard";
import { EmptyState } from "@/app/components/ui/AsyncState";
import { Card } from "@/app/components/ui/Card";
import { useAuthStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";

export function CompletedToursPanel({
  groups = [],
  guideId,
  loading = false,
  compact = false,
  limit,
}) {
  const displayed = limit ? groups.slice(0, limit) : groups;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: compact ? 2 : 3 }).map((_, i) => (
          <Card key={i} className="p-4 border-zinc-100 animate-pulse h-28 sm:h-32" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="No completed tours yet"
        description="When you mark a tour as done, it will appear here for your records."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={
          compact
            ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
        }
      >
        {displayed.map((group) => (
          <TourGroupCard
            key={group.id}
            group={group}
            guideId={guideId}
            compact={compact || group.status === "completed"}
          />
        ))}
      </div>
      {limit && groups.length > limit && (
        <p className="text-xs text-zinc-500 font-medium text-center">
          {groups.length - limit} more completed tour{groups.length - limit !== 1 ? "s" : ""} —{" "}
          <Link href="/guide/completed" className="text-green-600 font-black hover:underline">
            View all
          </Link>
        </p>
      )}
    </div>
  );
}

export function GuideCompletedToursLink({ count: countProp, className = "", compact = false }) {
  const { user } = useAuthStore();
  const { tourGroups, fetchTourGroups } = useGuideStore();

  useEffect(() => {
    if (user?.id) fetchTourGroups(user.id);
  }, [user?.id, fetchTourGroups]);

  const count =
    countProp ??
    tourGroups.filter((g) => g.status === "completed").length;

  const padding = compact ? "p-3" : "p-4";
  const descClass = compact ? "text-xs line-clamp-2" : "text-sm";

  return (
    <Card className={`${padding} border-green-100 bg-green-50/40 h-full flex flex-col justify-center ${className}`}>
      <div className={`flex ${compact ? "flex-col gap-2.5" : "flex-col sm:flex-row sm:items-center"} justify-between gap-3`}>
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`${compact ? "p-1.5" : "p-2"} bg-green-100 rounded-lg shrink-0`}>
            <CheckCircle size={compact ? 16 : 18} className="text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-green-700 tracking-widest">Completed Tours</p>
            <p className={`${descClass} text-zinc-600 font-medium mt-0.5`}>
              {count > 0
                ? `${count} finished tour${count !== 1 ? "s" : ""} on record.`
                : "Mark tours done to see them here."}
            </p>
          </div>
        </div>
        <Link
          href="/guide/completed"
          className={`inline-flex items-center justify-center gap-1.5 bg-green-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-green-700 transition-colors shrink-0 ${
            compact ? "w-full px-3 py-2 text-[9px]" : "px-4 py-2.5 text-[10px]"
          }`}
        >
          <Compass size={compact ? 12 : 14} />
          {count > 0 ? "View completed" : "Completed tours"}
        </Link>
      </div>
    </Card>
  );
}
