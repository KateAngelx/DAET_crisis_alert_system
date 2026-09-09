"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Eye, Users, ArrowRight } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { PublicRecentViewersList } from "@/app/components/analytics/PublicAnalyticsOverview";
import { iconSize, statGrid, typography } from "@/lib/designSystem";

export function AdminAnalyticsPanel({ className = "" }) {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      const session = await getActiveSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/admin/analytics/overview", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
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
  }, [user?.id]);

  if (loading) return null;
  if (!stats) return null;

  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={iconSize.section} className="text-blue-600" />
          <h2 className={typography.sectionTitle}>Public Traffic</h2>
        </div>
        <Link
          href="/about"
          className="text-[10px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1"
        >
          Public view <ArrowRight size={12} />
        </Link>
      </div>

      <div className={statGrid.dashboard}>
        <DashboardStatCard compact label="Views Today" value={stats.viewsToday ?? 0} icon={<Eye size={iconSize.stat} />} accent="blue" />
        <DashboardStatCard compact label="Unique Today" value={stats.uniqueVisitorsToday ?? 0} icon={<Users size={iconSize.stat} />} accent="purple" />
        <DashboardStatCard compact label="Guest Views" value={stats.guestViewsToday ?? 0} icon={<Eye size={iconSize.stat} />} accent="orange" />
        <DashboardStatCard compact label="Signed-in Views" value={stats.signedInViewsToday ?? 0} icon={<Users size={iconSize.stat} />} accent="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stats.topPages?.length > 0 && (
          <Card className="p-4 border-zinc-100">
            <p className={`${typography.sectionTitle} mb-3`}>Top Pages (7 days)</p>
            <ul className="space-y-2">
              {stats.topPages.map((page) => (
                <li key={page.path} className="flex justify-between gap-2 text-sm">
                  <span className="font-bold text-zinc-800 truncate">{page.label}</span>
                  <span className="text-[10px] font-black text-zinc-400 shrink-0">{page.count}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <PublicRecentViewersList viewers={stats.recentViewers} />
      </div>
    </section>
  );
}
