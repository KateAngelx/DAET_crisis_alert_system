"use client";

import React from "react";
import { GuideReportActions } from "@/app/components/guide/GuideReportActions";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { GuideCompletedToursLink } from "@/app/components/tour/CompletedToursPanel";

/** Compact paired actions for guide sub-pages — report + completed tours side by side. */
export function GuideDashboardQuickActions({
  className = "",
  showReport = true,
  showCompleted = true,
}) {
  if (!showReport && !showCompleted) return null;

  const single = !showReport || !showCompleted;

  return (
    <GuidePanel title="Quick actions" subtitle="Common guide tasks">
      <div
        className={`grid gap-3 ${single ? "grid-cols-1 max-w-xl" : "grid-cols-1 md:grid-cols-2"} ${className}`}
      >
        {showReport && <GuideReportActions compact className="h-full" />}
        {showCompleted && <GuideCompletedToursLink compact className="h-full" />}
      </div>
    </GuidePanel>
  );
}
