"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchWithFreshSession } from "@/lib/authSession";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";

const DashboardNavCountsContext = createContext({});

export function DashboardNavCountsProvider({ children }) {
  const role = useAuthStore((state) => state.user?.role);
  const notifications = useNotificationStore((state) => state.notifications);
  const [counts, setCounts] = useState({});

  const loadCounts = useCallback(async () => {
    if (role !== "admin") return;
    try {
      const response = await fetchWithFreshSession("/api/dashboard/navigation-counts", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load dashboard counts.");
      setCounts(result.counts || {});
    } catch (error) {
      console.error("[DashboardNavCounts] Failed to refresh counts:", error);
    }
  }, [role]);

  useEffect(() => {
    setCounts({});
    if (role !== "admin") return undefined;
    loadCounts();
    const intervalId = window.setInterval(loadCounts, 30_000);
    return () => window.clearInterval(intervalId);
  }, [loadCounts, role]);

  useEffect(() => {
    if (role === "admin") loadCounts();
  }, [loadCounts, notifications, role]);

  return (
    <DashboardNavCountsContext.Provider value={counts}>
      {children}
    </DashboardNavCountsContext.Provider>
  );
}

export function useDashboardNavCounts() {
  return useContext(DashboardNavCountsContext);
}
