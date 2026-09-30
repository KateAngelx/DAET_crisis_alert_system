"use client";

import { guideShell } from "@/lib/designSystem";
import { useInstalledApp } from "@/lib/useInstalledApp";

export function GuidePageShell({ children, className = "" }) {
  const installed = useInstalledApp();
  return (
    <div className={`${guideShell.page} ${installed ? "pb-20 lg:pb-0" : ""} ${className}`}>
      {children}
    </div>
  );
}


