"use client";

import React from "react";
import Link from "next/link";
import { Compass, Navigation, Users, ArrowRight, CalendarDays } from "lucide-react";
import { DestinationButton } from "@/app/components/tour/DestinationModal";
import { MarkTourDoneButton } from "@/app/components/tour/MarkTourDoneButton";
import {
  formatTourRoute,
  formatTourDate,
  formatTourEndDateTime,
  getTourGroupStatusStyle,
  isTourPastEndDate,
} from "@/lib/tourGroupRoute";

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
  const tourEnd = formatTourEndDateTime(group);
  const rowClass = `grid grid-cols-1 items-center gap-3 px-4 py-4 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-5 ${
    pastEnd ? "bg-green-50/50" : "bg-white hover:bg-zinc-50/70"
  }`;
  const compactClass = compact ? "sm:py-3" : "";

  if (isCompleted) {
    return (
      <Link
        href={`/guide/groups/${group.id}`}
        className={`${rowClass} ${compactClass} text-left no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="shrink-0 rounded-xl bg-green-100 p-2.5 text-green-700">
            <Compass size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-black uppercase tracking-tight text-zinc-900">{group.name}</h3>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${statusStyle.badge}`}>
                {statusStyle.label}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-blue-700">
              <Navigation size={12} className="shrink-0" />
              <span className="truncate">{formatTourRoute(group)}</span>
            </p>
            {tourDate ? (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                <CalendarDays size={12} className="shrink-0" /> {tourDate}
              </p>
            ) : null}
            {tourEnd ? (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                <CalendarDays size={12} className="shrink-0" /> Ends {tourEnd}
              </p>
            ) : null}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center justify-end gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
          View details <ArrowRight size={14} />
        </span>
      </Link>
    );
  }

  return (
    <article className={`${rowClass} ${compactClass}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="shrink-0 rounded-xl bg-purple-100 p-2.5 text-purple-700">
          <Compass size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-black uppercase tracking-tight text-zinc-900">{group.name}</h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${statusStyle.badge}`}>
              {statusStyle.label}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-blue-700">
            <Navigation size={12} className="shrink-0" />
            <span className="truncate">{formatTourRoute(group)}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {tourDate ? (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                <CalendarDays size={12} className="shrink-0" /> {tourDate}
              </p>
            ) : null}
            {tourEnd ? (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                <CalendarDays size={12} className="shrink-0" /> Ends {tourEnd}
              </p>
            ) : null}
            {group.trip_info ? (
              <p className="line-clamp-1 text-[11px] font-medium text-zinc-500">{group.trip_info}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-end sm:border-0 sm:pt-0">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 sm:mr-2">
          <Users size={13} className="text-blue-600" />
          {group.member_count || 0} confirmed tourist{(group.member_count || 0) !== 1 ? "s" : ""}
        </span>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {isActive && onOpenDestination ? <DestinationButton onClick={() => onOpenDestination(group)} /> : null}
          {isActive && guideId ? (
            <MarkTourDoneButton
              groupId={group.id}
              guideId={guideId}
              groupName={group.name}
              onSuccess={onCompleted}
              size={compact ? "sm" : "default"}
            />
          ) : null}
          <Link
            href={`/guide/groups/${group.id}`}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-blue-700 transition-colors hover:bg-blue-50"
          >
            View details <ArrowRight size={13} />
          </Link>
        </div>
      </div>
      {pastEnd ? (
        <p className="text-[10px] font-bold text-green-800 sm:col-span-2 sm:pl-12">
          Planned end time passed — mark this tour done after the tourists arrive safely.
        </p>
      ) : null}
    </article>
  );
}
