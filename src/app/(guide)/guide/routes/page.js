"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MapPin, Users, ArrowRight, Route,
} from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { useDangerousLocationStore } from "@/app/store/dangerousLocationStore";
import { useGuideStore } from "@/app/store/guideStore";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { RouteDetailModal } from "@/app/components/routes/RouteDetailModal";
import { DangerousLocationCard } from "@/app/components/danger/DangerousLocationCard";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { StatCardSkeletonGrid, MapSkeleton } from "@/app/components/ui/Skeletons";
import { AsyncState, EmptyState, ErrorState } from "@/app/components/ui/AsyncState";
import { Card } from "@/app/components/ui/Card";
import {
  buildRouteCatalog,
  findRouteItem,
  getRouteItemFromAdvisory,
  getRouteStatusStyles,
  resolveRouteItemView,
} from "@/lib/routesUtils";
import { advisoryToMapWarning } from "@/lib/routeAdvisoryUtils";
import { formatWarningTimeRange, getDangerSeverityStyles } from "@/lib/dangerousLocationUtils";
import { ROUTES_MAP_LEGEND } from "@/lib/mapPinUtils";
import { CategoryFilterSelect, StatusRecordList } from "@/app/components/shell/StatusRecordList";
import { PublicListModal } from "@/app/components/shell/PublicListModal";
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
  const [selectedHazard, setSelectedHazard] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
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

  const activeAreaHazards = useMemo(
    () => warnings.filter((w) => w.status === "Active" && w.is_public !== false),
    [warnings]
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

  const focusAreas = useCallback(() => setActiveFilter("areas"), []);

  useTravelDeepLinks({
    loading,
    publishedAdvisoryIds,
    activeAreaHazards,
    basePath: "/guide/routes",
    onFocusAreas: focusAreas,
  });

  useEffect(() => {
    const hazardId = searchParams.get("hazard");
    if (!hazardId) return;
    const warning = activeAreaHazards.find((item) => String(item.id) === String(hazardId));
    if (warning) setSelectedHazard(warning);
  }, [searchParams, activeAreaHazards]);

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

  const showClosed = activeFilter === "all" || activeFilter === "urgent" || activeFilter === "closed";
  const showCaution = activeFilter === "all" || activeFilter === "urgent" || activeFilter === "caution";
  const showDetours = activeFilter === "all" || activeFilter === "detours";
  const showSafe = activeFilter === "all" || activeFilter === "safe";
  const showAreas = activeFilter === "all" || activeFilter === "urgent" || activeFilter === "areas";
  const areaItems = activeFilter === "urgent"
    ? activeAreaHazards.filter((warning) => warning.severity !== "Caution")
    : activeAreaHazards;

  const listItems = [
    showClosed && relevantAffected.length > 0 && { key: "closed", kind: "route", items: relevantAffected },
    showCaution && relevantActive.length > 0 && { key: "caution", kind: "route", items: relevantActive },
    showAreas && areaItems.length > 0 && { key: "areas", kind: "hazard", items: areaItems },
    showDetours && relevantAlternative.length > 0 && { key: "detours", kind: "route", items: relevantAlternative },
    showSafe && relevantSafe.length > 0 && { key: "safe", kind: "route", items: relevantSafe },
  ].filter(Boolean).flatMap((group) => group.items.map((item) => ({ key: `${group.key}-${item.id}`, kind: group.kind, item })));

  const visibleRouteIds = new Set(
    listItems.filter((entry) => entry.kind === "route").map((entry) => entry.item.advisoryId)
  );
  const visibleHazards = listItems.filter((entry) => entry.kind === "hazard").map((entry) => entry.item);
  const visibleRouteAdvisories = catalog.published.filter((advisory) => visibleRouteIds.has(advisory.id));
  const visibleMapWarnings = [
    ...visibleRouteAdvisories.map(advisoryToMapWarning).filter(Boolean),
    ...visibleHazards,
  ];

  const advisoryRows = listItems.map((entry) => {
    if (entry.kind === "hazard") {
      const warning = entry.item;
      const styles = getDangerSeverityStyles(warning.severity);
      return {
        id: entry.key,
        status: styles.label,
        statusClass: styles.badge,
        place: warning.dangerous_location,
        type: warning.danger_type,
        when: formatWarningTimeRange(warning),
        onSelect: () => setSelectedHazard(warning),
        ariaLabel: "View hazard details",
      };
    }
    const route = entry.item;
    const styles = getRouteStatusStyles(route.status);
    return {
      id: entry.key,
      status: route.statusLabel || styles.label,
      statusClass: styles.badge,
      place: [route.from, route.to].filter(Boolean).join(" → "),
      type: route.subtitle,
      when: route.timeRange || route.updatedAtLabel || "—",
      onSelect: () => openRoute(route),
      ariaLabel: "View route details",
    };
  });

  return (
    <>
      <GuidePageHeader
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
        <StatCardSkeletonGrid count={5} className={statGrid.dashboardFive} />
      ) : (
        <div className={statGrid.dashboardFive}>
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
            description="The tourism office has not published any active routes or area hazards yet."
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
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900">Advisories</h2>
            <p className="text-xs text-zinc-500 font-medium mt-1 mb-3">
              Status, place, type, and when. View opens the full details.
            </p>
            <div className="mb-3">
              <CategoryFilterSelect
                label="Category"
                value={activeFilter}
                onChange={setActiveFilter}
                options={[
                  { value: "urgent", label: "Needs attention" },
                  { value: "closed", label: "Closed" },
                  { value: "caution", label: "Caution" },
                  { value: "detours", label: "Detours" },
                  { value: "areas", label: "Area hazards" },
                  { value: "safe", label: "Safe" },
                ]}
              />
            </div>
            <StatusRecordList rows={advisoryRows} />
          </section>

          <div className={`xl:sticky xl:top-24 ${mapBlocked ? "pointer-events-none opacity-40" : ""}`}>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <MapPin size={iconSize.section} className="text-blue-600" /> Travel Map
            </h2>
            <p className="text-xs text-zinc-500 font-medium mb-3">
              Pins and route lines follow the category above.
            </p>
            {loading ? (
              <MapSkeleton height="h-[min(520px,70vh)] sm:h-[520px]" />
            ) : (
              <CrisisHubMap
                alerts={[]}
                warnings={visibleMapWarnings}
                routeAdvisories={visibleRouteAdvisories}
                highlightRouteId={selectedRoute?.advisoryId}
                heightClass="h-[min(520px,70vh)] sm:h-[520px]"
                showTouristSpots={false}
                showSafeRoutePins
                legendItems={ROUTES_MAP_LEGEND}
              />
            )}
          </div>
        </div>
      </AsyncState>

      <GuideDashboardQuickActions />

      <RouteDetailModal
        open={!!selectedRoute}
        route={selectedRoute}
        catalog={catalog}
        onClose={closeRoute}
        onSelectRoute={openRoute}
      />

      <PublicListModal
        open={!!selectedHazard}
        onClose={() => {
          setSelectedHazard(null);
          if (searchParams.get("hazard")) router.replace("/guide/routes", { scroll: false });
        }}
        title="Area hazard"
        subtitle={selectedHazard?.dangerous_location}
      >
        {selectedHazard ? <DangerousLocationCard warning={selectedHazard} /> : null}
      </PublicListModal>
    </>
  );
}
