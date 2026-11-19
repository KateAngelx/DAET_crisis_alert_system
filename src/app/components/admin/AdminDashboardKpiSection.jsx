"use client";

import { DashboardKpiSection } from "@/app/components/dashboard/DashboardKpiSection";

/** @deprecated Use DashboardKpiSection — same layout, admin alias kept for existing imports. */
export function AdminDashboardKpiSection({ children, footer, pageId: _pageId }) {
  return <DashboardKpiSection footer={footer}>{children}</DashboardKpiSection>;
}
