"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, Eye, Users, Wifi, TrendingUp } from "lucide-react";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { Card } from "@/app/components/ui/Card";
import { iconSize, statGrid, typography } from "@/lib/designSystem";

function formatRelativeTime(iso) {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function PublicAnalyticsOverview({ compact = false, showTopPages = true, className = "" }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analytics/public-stats");
        const data = await res.json();
        if (!cancelled) setStats(data.stats || null);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <StatCardSkeletonGrid
        count={compact ? 3 : 4}
        className={compact ? statGrid.dashboardThree : statGrid.dashboard}
      />
    );
  }

  if (!stats) return null;

  const gridClass = compact ? statGrid.dashboardThree : statGrid.dashboard;

  return (
    <div className={`space-y-4 ${className}`}>
      {!compact && (
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl shrink-0">
            <BarChart3 size={iconSize.section} className="text-blue-600" />
          </div>
          <div>
            <h3 className={typography.cardTitle}>Platform Activity</h3>
            <p className={`${typography.description} mt-1 max-w-2xl`}>
              Live engagement on CONNECT-DAET — how many people are checking alerts and safety information today.
            </p>
          </div>
        </div>
      )}

      <div className={gridClass}>
        <DashboardStatCard
          compact
          label="Page Views Today"
          value={stats?.viewsToday ?? 0}
          icon={<Eye size={iconSize.stat} />}
          accent="blue"
        />
        <DashboardStatCard
          compact
          label="Unique Visitors Today"
          value={stats?.uniqueVisitorsToday ?? 0}
          icon={<Users size={iconSize.stat} />}
          accent="purple"
        />
        <DashboardStatCard
          compact
          label="Registered Online"
          value={stats?.registeredOnline ?? 0}
          icon={<Wifi size={iconSize.stat} />}
          accent="green"
        />
        {!compact && (
          <DashboardStatCard
            compact
            label="Views This Week"
            value={stats?.viewsThisWeek ?? 0}
            icon={<TrendingUp size={iconSize.stat} />}
            accent="orange"
          />
        )}
      </div>

      {showTopPages && stats?.topPages?.length > 0 && (
        <Card className="p-4 sm:p-5 border-zinc-100">
          <p className={`${typography.sectionTitle} mb-3`}>Most Viewed Pages (7 days)</p>
          <ul className="space-y-2">
            {stats.topPages.map((page) => (
              <li
                key={page.path}
                className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-zinc-50 last:border-0"
              >
                <span className="font-bold text-zinc-800 truncate">{page.label}</span>
                <span className="text-[10px] font-black uppercase text-zinc-400 shrink-0 tabular-nums">
                  {page.count} view{page.count !== 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/** Compact KPI strip for home page footer — small fixed height */
export function PublicAnalyticsFooterKPI({ className = "" }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analytics/public-stats");
        const data = await res.json();
        if (!cancelled) setStats(data.stats || null);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || !stats) return;
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ee1adc" },
      body: JSON.stringify({
        sessionId: "ee1adc",
        runId: "footer-kpi-ui",
        hypothesisId: "KPI1",
        location: "PublicAnalyticsOverview.jsx:PublicAnalyticsFooterKPI",
        message: "Footer KPI analytics rendered",
        data: {
          viewsToday: stats.viewsToday ?? 0,
          uniqueVisitorsToday: stats.uniqueVisitorsToday ?? 0,
          registeredOnline: stats.registeredOnline ?? 0,
          viewsThisWeek: stats.viewsThisWeek ?? 0,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [loading, stats]);

  if (loading) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${className}`} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[72px] bg-zinc-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const kpis = [
    { label: "Views Today", value: stats.viewsToday ?? 0, accent: "blue" },
    { label: "Unique Visitors", value: stats.uniqueVisitorsToday ?? 0, accent: "purple" },
    { label: "Registered Online", value: stats.registeredOnline ?? 0, accent: "green" },
    { label: "Views This Week", value: stats.viewsThisWeek ?? 0, accent: "orange" },
  ];

  return (
    <div className={className} aria-label="Platform activity summary">
      <div className="flex items-center gap-2 mb-2.5">
        <BarChart3 size={14} className="text-blue-600 shrink-0" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Live Activity</p>
          <p className="text-[10px] text-zinc-400 font-medium">Today on CONNECT-DAET</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {kpis.map((kpi) => (
          <PublicStatCard
            key={kpi.label}
            compact
            label={kpi.label}
            value={kpi.value}
            accent={kpi.accent}
          />
        ))}
      </div>
    </div>
  );
}

/** @deprecated Use PublicAnalyticsFooterKPI */
export const PublicAnalyticsFooterChart = PublicAnalyticsFooterKPI;

export function PublicRecentViewersList({ viewers = [], className = "" }) {
  if (!viewers.length) return null;

  return (
    <Card className={`p-4 sm:p-5 border-zinc-100 ${className}`}>
      <p className={`${typography.sectionTitle} mb-3`}>Recent Visitors</p>
      <ul className="space-y-2">
        {viewers.slice(0, 8).map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-zinc-50 last:border-0 text-sm"
          >
            <div className="min-w-0">
              <p className="font-bold text-zinc-900 truncate">{row.viewerLabel}</p>
              <p className="text-[10px] font-medium text-zinc-500 truncate">
                {row.pageLabel}
                {row.viewerType !== "guest" ? ` · ${row.viewerType}` : " · guest"}
              </p>
            </div>
            <span className="text-[10px] font-black uppercase text-zinc-400 shrink-0">
              {formatRelativeTime(row.viewedAt)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
