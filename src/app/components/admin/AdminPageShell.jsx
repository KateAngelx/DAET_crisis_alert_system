"use client";

import { adminShell } from "@/lib/designSystem";
import { useInstalledApp } from "@/lib/useInstalledApp";

export function AdminPageShell({ children, className = "" }) {
  const installed = useInstalledApp();
  return (
    <div className={`${adminShell.page} ${installed ? "pb-20 lg:pb-0" : ""} ${className}`}>
      {children}
    </div>
  );
}
