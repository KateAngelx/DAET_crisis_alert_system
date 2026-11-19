"use client";

import React from "react";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { GuideEmergencyReportsPanel } from "@/app/components/admin/GuideEmergencyReportsPanel";

export default function AdminGuideEmergenciesPage() {
  return (
    <>
      <DashboardPageHeader
        title="Guide emergencies"
        description="Urgent field reports submitted by licensed guides. Separate from crisis alerts and tourist incident reports."
      />
      <GuideEmergencyReportsPanel />
    </>
  );
}