"use client";

import React from "react";
import Link from "next/link";
import { Compass, Navigation, Users, ArrowRight, MapPin } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DestinationButton } from "@/app/components/tour/DestinationModal";
import { MarkTourDoneButton } from "@/app/components/tour/MarkTourDoneButton";
import {
  formatTourRoute,
  formatTourDate,
  getTourGroupStatusStyle,
  isTourPastEndDate,
} from "@/lib/tourGroupRoute";
import { iconSize, typography } from "@/lib/designSystem";

export function TourGroupCard({
  group,
  guideId,
  onOpenDestination,
  onCompleted,
  compact = false,
}) {
  const statusStyle = getTourGroupStatusStyle(group.status);
  const isActive = group.status === "active";
  const isCompleted = group.status === "completed";
  const pastEnd = isActive && isTourPastEndDate(group);
  const tourDate = formatTourDate(group);

  if (isCompleted) {
    return (
      <Link href={`/guide/groups/${group.id}`} className="block no-underline h-full">
        <Card
          className={`border-zinc-100 hover:shadow-md hover:border-green-200 transition-all h-full ${
            compact ? "p-3 sm:p-4" : "p-4 sm:p-5"
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className={`${compact ? "p-2" : "p-2.5"} bg-green-100 rounded-xl shrink-0`}>
              <Compass size={compact ? 14 : 16} className="text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <h3 className={`font-black text-zinc-900 uppercase tracking-tight truncate ${compact ? "text-xs" : "text-sm"}`}>
                  {group.name}
                </h3>
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0 ${statusStyle.badge}`}>
                  {statusStyle.label}
                </span>
              </div>
              <p className={`font-bold text-blue-600 flex items-center gap-1 ${compact ? "text-[10px]" : "text-xs"}`}>
                <Navigation size={10} className="shrink-0" />
                <span className="truncate">{formatTourRoute(group)}</span>
              </p>
              {tourDate && (
                <p className="text-[9px] font-bold text-zinc-400 mt-1 flex items-center gap-1">
                  <MapPin size={9} /> {tourDate}
                </p>
              )}
            </div>
            <ArrowRight size={compact ? 14 : 16} className="text-zinc-300 shrink-0 mt-1" />
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Card
      className={`border-zinc-100 hover:shadow-md transition-all h-full flex flex-col ${
        compact ? "p-4" : "p-5 sm:p-6"
      } ${pastEnd ? "ring-2 ring-green-200 border-green-200" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2.5 sm:p-3 bg-purple-100 rounded-2xl shrink-0">
            <Compass size={compact ? iconSize.section : iconSize.stat} className="text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className={`font-black text-zinc-900 uppercase tracking-tight truncate ${compact ? "text-sm" : "text-base"}`}>
                {group.name}
              </h3>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${statusStyle.badge}`}>
                {statusStyle.label}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-blue-600 flex items-center gap-1">
              <Navigation size={12} className="shrink-0" />
              <span className="truncate">{formatTourRoute(group)}</span>
            </p>
            {tourDate && (
              <p className="text-[10px] font-bold text-zinc-400 mt-1 flex items-center gap-1">
                <MapPin size={10} /> {tourDate}
              </p>
            )}
          </div>
        </div>
        {!compact && (
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-2xl font-black text-blue-600 leading-none">{group.member_count || 0}</p>
            <p className={`${typography.statLabel} text-zinc-400 mt-0.5`}>Tourists</p>
          </div>
        )}
      </div>

      {group.trip_info && (
        <p className={`text-sm text-zinc-600 mt-3 line-clamp-2 flex-1 ${compact ? "text-xs" : ""}`}>
          {group.trip_info}
        </p>
      )}

      {pastEnd && (
        <p className="text-[10px] font-bold text-green-700 mt-2 bg-green-50 px-3 py-2 rounded-xl border border-green-100">
          End date reached — mark this tour as done when tourists have arrived safely.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-zinc-100">
        <p className={`${typography.statLabel} text-zinc-400 flex items-center gap-1 sm:hidden`}>
          <Users size={12} /> {group.member_count || 0} tourist{(group.member_count || 0) !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {isActive && onOpenDestination && (
            <DestinationButton onClick={() => onOpenDestination(group)} />
          )}
          {isActive && guideId && (
            <MarkTourDoneButton
              groupId={group.id}
              guideId={guideId}
              groupName={group.name}
              onSuccess={onCompleted}
              size={compact ? "sm" : "default"}
            />
          )}
          <Link
            href={`/guide/groups/${group.id}`}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-colors shrink-0"
            aria-label="View tour group details"
          >
            <ArrowRight size={18} className="text-zinc-400" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
