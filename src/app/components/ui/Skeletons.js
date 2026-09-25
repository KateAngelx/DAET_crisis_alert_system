import React from "react";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { Card } from "@/app/components/ui/Card";
import { statGrid, statCard, outlinedCard, portalLayout } from "@/lib/designSystem";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";

export function StatCardSkeleton() {
  return (
    <OutlinedCard accent="zinc" className="border-zinc-200 h-full">
      <div className={`${statCard.iconRow}`}>
        <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl shrink-0" />
        <Skeleton className="h-2.5 w-8 sm:w-10" />
      </div>
      <Skeleton className="h-2 w-14 sm:h-2.5 sm:w-20 mb-1.5 sm:mb-2" />
      <Skeleton className="h-6 sm:h-7 lg:h-8 w-10 sm:w-12" />
    </OutlinedCard>
  );
}

export function StatCardSkeletonGrid({ count = 4, className = statGrid.dashboard }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroStatSkeleton() {
  return (
    <div className="pt-8 border-t border-zinc-200 w-full flex items-center gap-8">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <Skeleton className="h-8 w-10 mb-1" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function PublicStatCardSkeleton({ count = 3, className = statGrid.public, compact = false }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <OutlinedCard key={i} accent="zinc" compact={compact} className="border-zinc-200">
          <Skeleton className={`h-2.5 w-16 sm:w-20 mb-2 ${compact ? "h-2 w-14" : ""}`} />
          <Skeleton className={`h-7 sm:h-8 w-10 sm:w-12 ${compact ? "h-6 w-8" : ""}`} />
        </OutlinedCard>
      ))}
    </div>
  );
}

export function AlertCardSkeleton() {
  return (
    <OutlinedCard variant="accent" accent="zinc" padding={outlinedCard.alertPadding} className="border-zinc-200">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </OutlinedCard>
  );
}

export function AlertCardSkeletonList({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <AlertCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function NotificationItemSkeleton() {
  return (
    <OutlinedCard accent="zinc" padding={outlinedCard.notificationPadding} className="border-zinc-200">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </OutlinedCard>
  );
}

export function NotificationPanelSkeleton({ count = 4 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-50">
          <div className="flex items-start gap-3">
            <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 rounded-3xl lg:col-span-1 border-zinc-100">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="mt-6 pt-6 border-t border-zinc-200 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </Card>
      <Card className="p-6 rounded-3xl lg:col-span-2 border-zinc-100">
        <Skeleton className="h-6 w-40 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          ))}
          <Skeleton className="h-12 w-40 rounded-2xl mt-2" />
        </div>
      </Card>
    </div>
  );
}

export function ReportCardSkeleton() {
  return (
    <Card className="p-5 border-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-2.5 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

export function ReportCardSkeletonList({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ReportCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ReportDetailSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-28 mb-6" />
      <div className="flex justify-end gap-2 mb-6">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="space-y-6">
        <Card className="p-6 space-y-4 border-zinc-100">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-36" />
          </div>
        </Card>
        <Card className="p-6 border-zinc-100">
          <Skeleton className="h-3 w-28 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-2.5 w-56" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

export function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className={`h-4 ${i === 0 ? "w-16" : i === columns - 1 ? "w-20 ml-auto" : "w-32"}`} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </>
  );
}

export function UserCardSkeleton() {
  return (
    <Card className="p-6 border-zinc-100">
      <div className="flex items-center gap-5">
        <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-2xl mt-4" />
    </Card>
  );
}

export function UserCardSkeletonList({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <UserCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TouristCardSkeleton() {
  return (
    <Card className="p-5 border-zinc-100">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </Card>
  );
}

export function MapSkeleton({ height = "h-[480px]" }) {
  return (
    <div
      className={`bg-zinc-100 dark:bg-zinc-900/40 rounded-3xl border border-zinc-200 dark:border-zinc-800 ${height} flex items-center justify-center`}
      role="status"
      aria-label="Loading map"
    >
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-8 rounded-full mx-auto" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </div>
    </div>
  );
}

export function SettingsPanelSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3 py-2" role="status" aria-label="Loading settings">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function FeedbackWallSkeleton() {
  return (
    <div className="mb-10 sm:mb-12 space-y-3" role="status" aria-label="Loading community feedback">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}

export function AdminActivityTableSkeleton({ rows = 8 }) {
  return (
    <div className={`${portalLayout.listScrollPaneAdmin} overflow-x-auto`} role="status" aria-label="Loading activity">
      <table className="w-full border-collapse text-xs min-w-[720px]">
        <thead>
          <tr className="bg-zinc-50 text-zinc-500 text-[9px] uppercase tracking-widest font-black">
            <th className="px-4 py-3 text-left">When</th>
            <th className="px-4 py-3 text-left">Source</th>
            <th className="px-4 py-3 text-left">Action</th>
            <th className="px-4 py-3 text-left">Subject</th>
            <th className="px-4 py-3 text-left">Actor</th>
            <th className="px-4 py-3 text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          <TableSkeleton rows={rows} columns={6} />
        </tbody>
      </table>
    </div>
  );
}

export function AdminTablePlaceholderSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="overflow-x-auto py-2" role="status" aria-label="Loading table">
      <table className="w-full border-collapse">
        <tbody>
          <TableSkeleton rows={rows} columns={columns} />
        </tbody>
      </table>
    </div>
  );
}

export function SessionInboxSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3 py-2" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </div>
  );
}
