"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchWithFreshSession, getActiveSession } from "@/lib/authSession";
import { useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { parseApiJson } from "@/lib/parseApiJson";

const DashboardNavCountsContext = createContext({});

export function DashboardNavCountsProvider({ children }) {
  const role = useAuthStore((state) => state.user?.role);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const notifications = useNotificationStore((state) => state.notifications);
  const [counts, setCounts] = useState({});

  const loadCounts = useCallback(async () => {
    if (!isAuthenticated || role !== "admin") return;
    try {
      const session = await getActiveSession();
      if (!session?.access_token) return;

      const response = await fetchWithFreshSession("/api/dashboard/navigation-counts", {
        cache: "no-store",
      });
      const result = await parseApiJson(response, "Load dashboard counts");
      if (!response.ok) throw new Error(result.error || "Unable to load dashboard counts.");
      setCounts(result.counts || {});
    } catch (error) {
      const message = String(error?.message || error);
      if (message === "Not authenticated" || message.includes("Invalid session")) return;
      console.warn("[DashboardNavCounts] Failed to refresh counts:", message);
    }
  }, [isAuthenticated, role]);

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
