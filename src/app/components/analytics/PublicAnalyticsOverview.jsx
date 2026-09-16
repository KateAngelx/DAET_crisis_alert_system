"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, Eye, Users, Wifi, TrendingUp, Activity } from "lucide-react";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { Card } from "@/app/components/ui/Card";
import { iconSize, statGrid, typography } from "@/lib/designSystem";

const LIVE_KPIS = [
  { key: "viewsToday", label: "Page Views Today", icon: Eye, accent: "blue" },
  { key: "uniqueVisitorsToday", label: "Unique Visitors", icon: Users, accent: "purple" },
  { key: "registeredOnline", label: "Registered Online", icon: Wifi, accent: "green" },
  { key: "viewsThisWeek", label: "Views This Week", icon: TrendingUp, accent: "orange" },
];

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
              Live engagement on DAET TOURISM — how many people are checking alerts and safety information today.
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
          <p className="text-[10px] text-zinc-400 font-medium">Today on DAET TOURISM</p>
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

/** Public live analytics — visible to guests and signed-in users */
export function PublicLiveAnalyticsSection({ className = "" }) {
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
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "platform-pulse-dark-cards",
        hypothesisId: "D1",
        location: "PublicAnalyticsOverview.jsx:PublicLiveAnalyticsSection",
        message: "Platform Pulse dark stat cards rendered",
        data: { tone: "dark", kpiCount: LIVE_KPIS.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [loading, stats]);

  const topPages = stats?.topPages?.slice(0, 4) ?? [];
  const maxPageViews = topPages.reduce((max, page) => Math.max(max, page.count), 0);

  return (
    <section
      className={`relative py-12 sm:py-16 overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-blue-950 ${className}`}
      aria-label="Live platform activity"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[320px] h-[320px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-200">Live Activity</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2">
            Platform Pulse
          </h2>
          <p className="text-sm text-zinc-400 font-medium max-w-xl mx-auto leading-relaxed">
            Real-time engagement on DAET TOURISM — open to everyone checking alerts and safety information in Daet.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[88px] sm:h-[96px] rounded-xl border border-white/10 bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
              {LIVE_KPIS.map(({ key, label, icon: Icon, accent }) => (
                <DashboardStatCard
                  key={key}
                  compact
                  tone="dark"
                  label={label}
                  value={stats[key] ?? 0}
                  icon={<Icon size={iconSize.stat} />}
                  accent={accent}
                />
              ))}
            </div>

            {topPages.length > 0 && (
              <div className="mt-8 sm:mt-10 max-w-3xl mx-auto rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-md p-5 sm:p-6">
                <div className="flex items-center justify-center gap-2 mb-5">
                  <Activity size={16} className="text-blue-300" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
                    Most Visited This Week
                  </p>
                </div>
                <ul className="space-y-3">
                  {topPages.map((page) => {
                    const width = maxPageViews > 0 ? Math.round((page.count / maxPageViews) * 100) : 0;
                    return (
                      <li key={page.path} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-bold text-zinc-100 truncate">{page.label}</span>
                          <span className="text-[10px] font-black uppercase text-zinc-400 tabular-nums shrink-0">
                            {page.count} view{page.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700"
                            style={{ width: `${Math.max(width, 8)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-zinc-500 font-medium">
            Live activity stats will appear here once analytics are available.
          </p>
        )}
      </div>
    </section>
  );
}

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
