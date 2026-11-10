"use client";

import React from "react";

export function DashboardNavCountBadge({ count, label }) {
  const value = Number(count) || 0;
  if (value <= 0) return null;

  return (
    <span
      className="ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-red-700"
      aria-label={`${value} ${label}`}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}
