"use client";

import { portalLayout } from "@/lib/designSystem";

/** Flex column body for panels that contain a fixed header/filters + scrollable list (Active Announcements pattern). */
export function PortalPanelBody({ children, className = portalLayout.panelBodyStack }) {
  return <div className={className}>{children}</div>;
}

/** Internal scroll region for long card/list content — does not stretch the outer panel. */
export function PortalListScrollRegion({
  children,
  className = portalLayout.listScrollPane,
}) {
  return <div className={className}>{children}</div>;
}
