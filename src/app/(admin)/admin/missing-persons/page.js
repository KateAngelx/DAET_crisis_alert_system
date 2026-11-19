"use client";

import React from "react";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { MissingPersonsPanel } from "@/app/components/admin/MissingPersonsPanel";

export default function AdminMissingPersonsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Missing persons"
        description="Tourist missing-person cases from incident reports and follow-up status."
      />
      <MissingPersonsPanel />
    </>
  );
}