"use client";

import React from "react";
import { portalLayout } from "@/lib/designSystem";

/**
 * Stat card row placement: always directly under the page header / tabs / context banner,
 * before filters and main panels (all roles).
 */
export function DashboardKpiSection({ children, footer, className = "" }) {
  return (
    <div className={`${portalLayout.dashboardKpiSection} ${className}`.trim()}>
      {children}
      {footer ?? null}
    </div>
  );
}