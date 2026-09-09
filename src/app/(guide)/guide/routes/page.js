"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertOctagon, CheckCircle, Navigation, MapPin, Users, ArrowRight, Route, ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { useDangerousLocationStore } from "@/app/store/dangerousLocationStore";
import { useGuideStore } from "@/app/store/guideStore";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { RouteListCard } from "@/app/components/routes/RouteListCard";
import { RouteDetailModal } from "@/app/components/routes/RouteDetailModal";
import { DangerousLocationCard } from "@/app/components/danger/DangerousLocationCard";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { StatCardSkeletonGrid, MapSkeleton } from "@/app/components/ui/Skeletons";
import { AsyncState, EmptyState, ErrorState } from "@/app/components/ui/AsyncState";
import { Card } from "@/app/components/ui/Card";
import {
  buildRouteCatalog,
  findRouteItem,
  getRouteItemFromAdvisory,
  resolveRouteItemView,
} from "@/lib/routesUtils";
import { advisoryToMapWarning } from "@/lib/routeAdvisoryUtils";
import { formatTourRoute, getRelevantRouteAdvisoriesForGroup } from "@/lib/tourGroupRoute";
import { useTravelDeepLinks } from "@/lib/useTravelDeepLinks";
import { iconSize, statGrid } from "@/lib/designSystem";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { GuideDashboardQuickActions } from "@/app/components/guide/GuideDashboardQuickActions";

export default function GuideRoutesPage() {
  const { user } = useAuthStore();
  const { advisories, fetchAdvisories, loading: routesLoading, error: routesError } = useRouteAdvisoryStore();
  const { warnings, fetchWarnings, loading: hazardsLoading, error: hazardsError } = useDangerousLocationStore();
  const { tourGroups, fetchTourGroups, resetGuideScope, loading: guideLoading } = useGuideStore();
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [highlightedHazardId, setHighlightedHazardId] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const loading = routesLoading || hazardsLoading;
  const error = routesError || hazardsError;

  useEffect(() => {
    if (!user?.id) return;
    resetGuideScope();
    fetchTourGroups(user.id);
    fetchAdvisories();
    fetchWarnings();
  }, [user?.id, resetGuideScope, fetchTourGroups, fetchAdvisories, fetchWarnings]);

  const activeGroups = useMemo(
    () => tourGroups.filter((g) => g.status === "active"),
    [tourGroups]
  );

  const catalog = useMemo(() => buildRouteCatalog(advisories), [advisories]);

  const mapWarnings = useMemo(
    () => catalog.published.map(advisoryToMapWarning).filter(Boolean),
    [catalog.published]
  );

  const activeAreaHazards = useMemo(
    () => warnings.filter((w) => w.status === "Active" && w.is_public !== false),
    [warnings]
  );

  const allMapWarnings = useMemo(
    () => [...mapWarnings, ...activeAreaHazards],
    [mapWarnings, activeAreaHazards]
  );

  const publishedAdvisoryIds = useMemo(
    () => new Set(catalog.published.map((a) => a.id)),
    [catalog.published]
  );

  const groupRouteAdvisories = useMemo(() => {
    const map = new Map();
    activeGroups.forEach((group) => {
      const relevant = getRelevantRouteAdvisoriesForGroup(catalog.published, group);
      if (relevant.length > 0) map.set(group.id, { group, advisories: relevant });
    });
    return map;
  }, [activeGroups, catalog.published]);

  const relevantIds = useMemo(() => {
    const ids = new Set();
    groupRouteAdvisories.forEach(({ advisories: items }) => items.forEach((a) => ids.add(a.id)));
    return ids;
  }, [groupRouteAdvisories]);

  const relevantSafe = useMemo(
    () => catalog.safe.filter((r) => relevantIds.has(r.advisoryId)),
    [catalog.safe, relevantIds]
  );
  const relevantActive = useMemo(
    () => catalog.active.filter((r) => relevantIds.has(r.advisoryId)),
    [catalog.active, relevantIds]
  );
  const relevantAffected = useMemo(
    () => catalog.affected.filter((r) => relevantIds.has(r.advisoryId)),
    [catalog.affected, relevantIds]
  );
  const relevantAlternative = useMemo(
    () => catalog.alternative.filter((r) => relevantIds.has(r.advisoryId)),
    [catalog.alternative, relevantIds]
  );

  const hasTravelContent = !catalog.isEmpty || activeAreaHazards.length > 0;
  const statsLoading = loading || guideLoading;
  const mapBlocked = !!selectedRoute;

  const focusAreas = useCallback(() => {}, []);

  useTravelDeepLinks({
    loading,
    publishedAdvisoryIds,
    activeAreaHazards,
    basePath: "/guide/routes",
    onFocusAreas: focusAreas,
  });

  useEffect(() => {
    setHighlightedHazardId(searchParams.get("hazard") || null);
  }, [searchParams]);

  const openRoute = useCallback((route) => setSelectedRoute(route), []);

  const closeRoute = useCallback(() => {
    setSelectedRoute(null);
    if (searchParams.get("route") || searchParams.get("hazard")) {
      router.replace("/guide/routes", { scroll: false });
    }
  }, [router, searchParams]);

  useEffect(() => {
    const routeId = searchParams.get("route");
    const viewParam = searchParams.get("view");
    if (!routeId || loading) return;

    const view =
      viewParam === "alternative"
        ? "alternative"
        : viewParam === "safe"
          ? "safe"
          : viewParam === "caution"
            ? "caution"
            : null;

    const fromCatalog = findRouteItem(catalog, routeId, view || undefined);
    if (fromCatalog) {
      setSelectedRoute(fromCatalog);
      return;
    }

    const advisory = catalog.published.find((a) => a.id === routeId);
    if (advisory) {
      setSelectedRoute(getRouteItemFromAdvisory(advisory, view || resolveRouteItemView(advisory)));
    }
  }, [searchParams, catalog, loading]);

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title={ROLE_INTERFACE.guide.routes.title}
        description={ROLE_INTERFACE.guide.routes.description}
        action={
          <Link
            href="/routes"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-colors"
          >
            Public View <ArrowRight size={16} />
          </Link>
        }
      />

      <RoleContextBanner helper={ROLE_INTERFACE.guide.routes.helper} tone="info" />

      {statsLoading ? (
        <StatCardSkeletonGrid count={5} className={`${statGrid.dashboardThree} lg:grid-cols-5`} />
      ) : (
        <div className={`${statGrid.dashboardThree} lg:grid-cols-5`}>
          <DashboardStatCard compact label="Safe (Your Groups)" value={relevantSafe.length} accent="green" />
          <DashboardStatCard compact label="Caution" value={relevantActive.length} accent="orange" />
          <DashboardStatCard compact label="Closed / Avoid" value={relevantAffected.length} accent="red" />
          <DashboardStatCard compact label="Detours" value={relevantAlternative.length} accent="blue" />
          <DashboardStatCard compact label="Area Hazards" value={activeAreaHazards.length} accent="red" />
        </div>
      )}

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!loading && !error && !hasTravelContent}
        onRetry={() => {
          fetchAdvisories();
          fetchWarnings();
        }}
        errorFallback={
          <ErrorState
            message={error}
            onRetry={() => {
              fetchAdvisories();
              fetchWarnings();
            }}
            title="Could not load travel advisories"
          />
        }
        emptyFallback={
          <EmptyState
            icon={Route}
            title="No travel advisories"
            description="The LGU has not published any active routes or area hazards yet."
          />
        }
      >
        {activeGroups.length > 0 && (
          <Card className="p-5 border-zinc-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
              <Users size={14} /> Active Tour Groups & Locations
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeGroups.map((group) => {
                const match = groupRouteAdvisories.get(group.id);
                return (
                  <Link key={group.id} href={`/guide/groups/${group.id}`} className="block no-underline">
                    <div className={`p-4 rounded-2xl border ${match ? "border-orange-200 bg-orange-50/50" : "border-zinc-100 bg-zinc-50"}`}>
                      <p className="font-black text-zinc-900 text-sm uppercase">{group.name}</p>
                      <p className="text-xs text-blue-600 font-medium mt-1">{formatTourRoute(group)}</p>
                      {match ? (
                        <p className="text-[10px] font-black uppercase text-orange-700 mt-2">
                          {match.advisories.length} route advis{match.advisories.length > 1 ? "ories" : "ory"} on this path
                        </p>
                      ) : (
                        <p className="text-[10px] font-black uppercase text-green-600 mt-2">No route advisories for this group</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div className="space-y-8">
            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                <AlertOctagon size={iconSize.section} className="text-red-600" /> Routes Affecting Your Groups
              </h2>
              {relevantAffected.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="No closed routes"
                  description="None of your active tour group routes match a published closure or unsafe advisory."
                />
              ) : (
                <div className="space-y-3">
                  {relevantAffected.map((route) => (
                    <RouteListCard key={route.id} route={route} onSelect={openRoute} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                <AlertOctagon size={iconSize.section} className="text-red-600" /> Area Hazards
              </h2>
              {activeAreaHazards.length === 0 ? (
                <p className="text-sm text-zinc-500 font-medium p-4 bg-green-50 rounded-2xl border border-green-200 text-green-700">
                  No area hazards are active right now.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeAreaHazards.map((warning) => (
                    <DangerousLocationCard
                      key={warning.id}
                      warning={warning}
                      highlighted={highlightedHazardId === warning.id}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                <Navigation size={iconSize.section} className="text-blue-600" /> Recommended Detours
              </h2>
              {relevantAlternative.length === 0 ? (
                <p className="text-sm text-zinc-500 font-medium p-4 bg-zinc-50 rounded-2xl">
                  No detours are published for your groups right now.
                </p>
              ) : (
                <div className="space-y-3">
                  {relevantAlternative.map((route) => (
                    <RouteListCard key={route.id} route={route} onSelect={openRoute} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                <ShieldCheck size={iconSize.section} className="text-green-600" /> Safe Routes
              </h2>
              {relevantSafe.length === 0 ? (
                <p className="text-sm text-zinc-500 font-medium p-4 bg-zinc-50 rounded-2xl">
                  No safe routes match your groups right now.
                </p>
              ) : (
                <div className="space-y-3">
                  {relevantSafe.map((route) => (
                    <RouteListCard key={route.id} route={route} onSelect={openRoute} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                <CheckCircle size={iconSize.section} className="text-orange-500" /> Open with Caution
              </h2>
              {relevantActive.length === 0 ? (
                <p className="text-sm text-zinc-500 font-medium p-4 bg-zinc-50 rounded-2xl">
                  No caution-level advisories match your groups.
                </p>
              ) : (
                <div className="space-y-3">
                  {relevantActive.map((route) => (
                    <RouteListCard key={route.id} route={route} onSelect={openRoute} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className={`xl:sticky xl:top-24 ${mapBlocked ? "pointer-events-none opacity-40" : ""}`}>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <MapPin size={iconSize.section} className="text-blue-600" /> Travel Map
            </h2>
            <p className="text-xs text-zinc-500 font-medium mb-3">
              Route lines and hazard pins — same view tourists see on the public page.
            </p>
            {loading ? (
              <MapSkeleton height="h-[min(520px,70vh)] sm:h-[520px]" />
            ) : (
              <CrisisHubMap
                alerts={[]}
                warnings={allMapWarnings}
                routeAdvisories={catalog.published}
                highlightRouteId={selectedRoute?.advisoryId}
                heightClass="h-[min(520px,70vh)] sm:h-[520px]"
                showTouristSpots={false}
                showSafeRoutePins
              />
            )}
          </div>
        </div>
      </AsyncState>

      <GuideDashboardQuickActions className="mt-6" />

      <RouteDetailModal
        open={!!selectedRoute}
        route={selectedRoute}
        catalog={catalog}
        onClose={closeRoute}
        onSelectRoute={openRoute}
      />
    </div>
  );
}
