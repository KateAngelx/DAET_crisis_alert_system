"use client";

import { Radio } from "lucide-react";
import { AdminDashboardQuickNavLink } from "@/app/components/admin/AdminDashboardQuickNavLink";

/** Compact link — below stat cards on satellite admin pages */
export function CommandCenterQuickLink() {
  return <AdminDashboardQuickNavLink href="/crisis/admin" icon={Radio} label="Command Center" />;
}
