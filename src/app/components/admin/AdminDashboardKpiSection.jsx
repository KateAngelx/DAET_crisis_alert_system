"use client";

import React, { useEffect, useRef } from "react";
import { portalLayout } from "@/lib/designSystem";

/**
 * Command Center KPI block: stat card grid + optional quick-nav row (tight gap),
 * then gap-6 to the next page section via parent stack.
 */
export function AdminDashboardKpiSection({ children, footer, pageId = "unknown" }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
  }, [footer, pageId]);

  return (
    <div ref={rootRef} className={portalLayout.dashboardKpiSection}>
      {children}
      {footer ?? null}
    </div>
  );
}
