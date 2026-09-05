import React from "react";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { Card } from "@/app/components/ui/Card";
import { statGrid, statCard } from "@/lib/designSystem";

export function StatCardSkeleton() {
  return (
    <Card className={`${statCard.dashboard} border-zinc-100`}>
      <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
        <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl shrink-0" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-2.5 w-20 sm:w-24 mb-2" />
      <Skeleton className="h-7 sm:h-8 w-12 sm:w-14" />
    </Card>
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

export function MiniStatSkeleton({ count = 3 }) {
  return (
    <div className={`grid grid-cols-${count} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 text-center border-zinc-100">
          <Skeleton className="h-2.5 w-12 mx-auto mb-2" />
          <Skeleton className="h-7 w-8 mx-auto" />
        </Card>
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

export function PublicStatCardSkeleton({ count = 3 }) {
  return (
    <div className={statGrid.public}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={`${statCard.public} border-zinc-100 rounded-3xl min-w-0`}>
          <Skeleton className="h-8 sm:h-9 w-12 sm:w-14 mb-3 sm:mb-4" />
          <Skeleton className="h-2.5 w-20 sm:w-24" />
        </Card>
      ))}
    </div>
  );
}

export function AlertCardSkeleton() {
  return (
    <Card className="p-6 border-l-[12px] border-l-zinc-200 rounded-3xl">
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
    </Card>
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

export function AlertDetailSkeleton() {
  return (
    <Card className="max-w-2xl w-full overflow-hidden border-none shadow-2xl">
      <div className="bg-zinc-200 p-8">
        <Skeleton className="h-12 w-12 rounded-2xl mb-6" />
        <Skeleton className="h-8 w-3/4 mb-4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div className="p-8 space-y-6 bg-white">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </Card>
  );
}

export function NotificationItemSkeleton() {
  return (
    <Card className="p-6 border-zinc-100">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-32 mt-1" />
        </div>
      </div>
    </Card>
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
    <div className={`bg-zinc-100 rounded-3xl border border-zinc-200 ${height} flex items-center justify-center`}>
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-8 rounded-full mx-auto" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </div>
    </div>
  );
}

export function IncidentStatSkeleton({ count = 7 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 text-center border-zinc-100">
          <Skeleton className="h-2.5 w-12 mx-auto mb-2" />
          <Skeleton className="h-7 w-8 mx-auto" />
        </Card>
      ))}
    </div>
  );
}
