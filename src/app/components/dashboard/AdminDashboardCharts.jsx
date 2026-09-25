"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, BarChart3, CalendarRange, TrendingUp } from "lucide-react";
import { LineTrendChart } from "@/app/components/dashboard/LineTrendChart";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { Card } from "@/app/components/ui/Card";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { DASHBOARD_PERIODS, normalizeDashboardPeriod } from "@/lib/dashboardTrends";
import { adminShell, iconSize, statGrid, typography } from "@/lib/designSystem";

const SERIES_COLORS = {
  alerts: "#dc2626",
  incidents: "#ea580c",
  resolvedAlerts: "#16a34a",
  closedIncidents: "#2563eb",
  openIncidents: "#9333ea",
  pageViews: "#2563eb",
  uniqueVisitors: "#9333ea",
};

const PERIOD_OPTIONS = Object.entries(DASHBOARD_PERIODS).map(([id, config]) => ({
  id,
  label: config.label,
  short:
    id === "7d"
      ? "7 Days"
      : id === "30d"
        ? "30 Days"
        : id === "12m"
          ? "12 Months"
          : "5 Years",
}));

function AnalyticsShell({ period, onPeriodChange, sidebarDisabled, loading, children }) {
  return (
    <section className={adminShell.panel}>
      <div className="flex flex-col md:flex-row md:items-stretch">
        <PeriodSidebar
          period={period}
          onChange={onPeriodChange}
          disabled={sidebarDisabled}
          loading={loading}
        />
        <div className="flex-1 min-w-0 p-4 sm:p-6 space-y-5">{children}</div>
      </div>
    </section>
  );
}

export function AdminDashboardCharts() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState("7d");
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMetrics = useCallback(async (selectedPeriod) => {
    setLoading(true);
    setError(null);
    const session = await getActiveSession();
    if (!session?.access_token) {
      setLoading(false);
      setError("Session expired");
      return;
    }

    try {
      const normalized = normalizeDashboardPeriod(selectedPeriod);
      const res = await fetch(`/api/admin/dashboard/metrics?period=${normalized}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load dashboard metrics");

      setMetrics(data.metrics || null);
    } catch (err) {
      setMetrics(null);
      setError(err.message || "Could not load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    loadMetrics(period);
  }, [user?.id, period, loadMetrics]);

  const handlePeriodChange = (next) => {
    setPeriod(normalizeDashboardPeriod(next));
  };

  if (loading && !metrics) {
    return (
      <AnalyticsShell period={period} onPeriodChange={handlePeriodChange} sidebarDisabled loading>
        <StatCardSkeletonGrid count={4} />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <StatCardSkeletonGrid count={1} />
          <StatCardSkeletonGrid count={1} />
        </div>
      </AnalyticsShell>
    );
  }

  if (error && !metrics) {
    return (
      <AnalyticsShell period={period} onPeriodChange={handlePeriodChange}>
        <Card className="p-6 border-red-100 bg-red-50/40 text-center border-none shadow-none">
          <p className="text-sm font-bold text-red-700">{error}</p>
          <p className="text-xs text-red-600/80 mt-1">Charts require a live database connection.</p>
        </Card>
      </AnalyticsShell>
    );
  }

  const { kpis, series, topPages, meta } = metrics;
  const chartSpan = meta?.chartTitle || "7 Days";
  const periodShort = DASHBOARD_PERIODS[meta?.period]?.kpiShort || meta?.period;
  const backlogSubtitle =
    meta?.granularity === "month"
      ? "Open incidents at end of each month"
      : meta?.granularity === "year"
        ? "Open incidents at end of each year"
        : "Open incident count at end of each day";

  return (
    <AnalyticsShell period={period} onPeriodChange={handlePeriodChange} loading={loading}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pb-1 border-b border-zinc-100">
        <div>
          <h2 className={`${typography.sectionTitle} text-zinc-500 mb-1`}>Trend analysis</h2>
          <p className="text-xs text-zinc-400 font-medium">
            {meta?.periodLabel} · {meta?.timeZone || "Asia/Manila"} · live database
          </p>
        </div>
        {loading && (
          <p className="text-[10px] font-bold uppercase text-blue-600 tracking-widest">Updating…</p>
        )}
      </div>

      <div className={`${statGrid.dashboard} ${loading ? "opacity-60 pointer-events-none" : ""}`}>
        <DashboardStatCard
          compact
          label={`Crisis Events (${periodShort})`}
          value={kpis.crisisEventsInPeriod}
          icon={<Activity size={iconSize.stat} />}
          accent="red"
          subtext={`${kpis.alertsIssuedInPeriod} alerts · ${kpis.incidentsReportedInPeriod} reports`}
        />
        <DashboardStatCard
          compact
          label={`Resolved (${periodShort})`}
          value={kpis.resolvedInPeriod}
          icon={<TrendingUp size={iconSize.stat} />}
          accent="green"
          subtext={`${kpis.alertsResolvedInPeriod} alerts · ${kpis.incidentsClosedInPeriod} incidents`}
        />
        <DashboardStatCard
          compact
          label="Registered Tourists"
          value={kpis.touristCount}
          icon={<BarChart3 size={iconSize.stat} />}
          accent="blue"
          subtext={`+${kpis.newTouristsInPeriod} in period · ${kpis.onlineCount} online`}
        />
        <DashboardStatCard
          compact
          label="Active Tour Groups"
          value={kpis.activeTourGroups}
          icon={<Activity size={iconSize.stat} />}
          accent="purple"
          subtext={`${kpis.assignedTourists} assigned · ${kpis.openIncidents} open reports`}
        />
      </div>

      <div
        className={`grid grid-cols-1 xl:grid-cols-2 gap-4 ${loading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <LineTrendChart
          title={`Crisis Activity — ${chartSpan}`}
          subtitle="Alerts issued and reports submitted"
          series={[
            {
              id: "alerts",
              label: "Alerts issued",
              color: SERIES_COLORS.alerts,
              fill: true,
              data: series.alertsIssued,
            },
            {
              id: "incidents",
              label: "Reports submitted",
              color: SERIES_COLORS.incidents,
              fill: true,
              data: series.incidentsReported,
            },
          ]}
        />

        <LineTrendChart
          title={`Resolution Trend — ${chartSpan}`}
          subtitle="Alerts resolved and incidents closed"
          series={[
            {
              id: "resolved-alerts",
              label: "Alerts resolved",
              color: SERIES_COLORS.resolvedAlerts,
              fill: true,
              data: series.alertsResolved,
            },
            {
              id: "closed-incidents",
              label: "Incidents closed",
              color: SERIES_COLORS.closedIncidents,
              fill: true,
              data: series.incidentsClosed,
            },
          ]}
        />

        <LineTrendChart
          title={`Open Report Backlog — ${chartSpan}`}
          subtitle={backlogSubtitle}
          series={[
            {
              id: "open-incidents",
              label: "Open reports",
              color: SERIES_COLORS.openIncidents,
              fill: true,
              data: series.openIncidentBacklog,
            },
          ]}
        />

        <LineTrendChart
          title={`Public Traffic — ${chartSpan}`}
          subtitle="Page views and unique visitors"
          series={[
            {
              id: "page-views",
              label: "Page views",
              color: SERIES_COLORS.pageViews,
              fill: true,
              data: series.dailyPageViews,
            },
            {
              id: "unique-visitors",
              label: "Unique visitors",
              color: SERIES_COLORS.uniqueVisitors,
              fill: false,
              data: series.dailyUniqueVisitors,
            },
          ]}
          emptyMessage="No public page views in this period."
        />
      </div>

      {topPages?.length > 0 && (
        <Card className={`p-4 border-zinc-100 ${loading ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className={typography.sectionTitle}>Top pages · {meta?.periodLabel}</p>
            <Link
              href="/about"
              className="text-[10px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1"
            >
              Public view <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topPages.slice(0, 4).map((page) => (
              <div
                key={page.path}
                className="flex items-center justify-between gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-100"
              >
                <span className="text-xs font-bold text-zinc-700 truncate">{page.label}</span>
                <span className="text-sm font-black text-blue-600 tabular-nums shrink-0">
                  {page.count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AnalyticsShell>
  );
}

function PeriodSidebar({ period, onChange, disabled = false, loading = false }) {
  const activeConfig = DASHBOARD_PERIODS[normalizeDashboardPeriod(period)];

  return (
    <aside className="md:w-44 lg:w-48 shrink-0 border-b md:border-b-0 md:border-r border-zinc-200 bg-zinc-50/80 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
        <CalendarRange size={12} />
        Analysis range
      </p>
      <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0" role="tablist">
        {PERIOD_OPTIONS.map((opt) => {
          const active = period === opt.id;
          return (
            <li key={opt.id} className="shrink-0 md:shrink md:w-full">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => onChange(opt.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all border ${
                  active
                    ? "bg-white text-zinc-900 border-zinc-200 shadow-sm md:border-l-[3px] md:border-l-blue-600 md:pl-[calc(0.75rem-2px)]"
                    : "bg-transparent text-zinc-500 border-transparent hover:bg-white/80 hover:text-zinc-800"
                } ${loading && active ? "opacity-70" : ""}`}
              >
                {opt.short}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="hidden md:block mt-4 pt-3 border-t border-zinc-200 text-[9px] font-medium text-zinc-400 leading-relaxed">
        {activeConfig?.label}
        <br />
        <span className="text-zinc-300">Asia/Manila · DB</span>
      </p>
    </aside>
  );
}
