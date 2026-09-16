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
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "kpi-spacing-v1",
        hypothesisId: "H-kpi-gap",
        location: "AdminDashboardKpiSection.jsx:layout",
        message: "KPI section spacing measured",
        data: {
          pageId,
          flexGap: cs.gap,
          childCount: el.childElementCount,
          hasFooter: Boolean(footer),
          sectionWidth: Math.round(el.getBoundingClientRect().width),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [footer, pageId]);

  return (
    <div ref={rootRef} className={portalLayout.dashboardKpiSection}>
      {children}
      {footer ?? null}
    </div>
  );
}
