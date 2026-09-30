"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, Route, AlertTriangle } from "lucide-react";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { useDangerousLocationStore } from "@/app/store/dangerousLocationStore";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { RouteDetailModal } from "@/app/components/routes/RouteDetailModal";
import { DangerousLocationCard } from "@/app/components/danger/DangerousLocationCard";
import { InfoPageHero, PublicPageShell, PublicPageContent, PublicPanel } from "@/app/components/InfoPageHero";
import { AsyncState, ErrorState, EmptyState } from "@/app/components/ui/AsyncState";
import { AlertCardSkeletonList, MapSkeleton } from "@/app/components/ui/Skeletons";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import {
  buildRouteCatalog,
  findRouteItem,
  getRouteItemFromAdvisory,
  getRouteStatusStyles,
  resolveRouteItemView,
} from "@/lib/routesUtils";
import { formatWarningTimeRange, getDangerSeverityStyles } from "@/lib/dangerousLocationUtils";
import { advisoryToMapWarning } from "@/lib/routeAdvisoryUtils";
import { useTravelDeepLinks } from "@/lib/useTravelDeepLinks";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { portalLayout, portalShell } from "@/lib/designSystem";
import { ROUTES_MAP_LEGEND } from "@/lib/mapPinUtils";
import { PublicListModal } from "@/app/components/shell/PublicListModal";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "urgent", label: "Needs attention" },
  { id: "closed", label: "Closed" },
  { id: "caution", label: "Caution" },
  { id: "detours", label: "Detours" },
  { id: "areas", label: "Area hazards" },
  { id: "safe", label: "Safe" },
];

const ADVISORY_ROW =
  "grid grid-cols-[4.75rem_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] items-center gap-x-2";

function ViewDetailsMark() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wide text-blue-600 shrink-0">
      View
      <ArrowRight size={14} aria-hidden />
    </span>
  );
}

function AdvisoryCell({ children, title }) {
  return (
    <span className="truncate text-xs font-medium text-zinc-700" title={title}>
      {children || "—"}
    </span>
  );
}

function AdvisoryFormList({ items, onSelectRoute, onSelectHazard, highlightedHazardId }) {
  if (!items.length) {
    return (
      <p className="text-sm font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-xl p-3">
        Nothing is published in this category right now.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
      <div className={`${ADVISORY_ROW} px-3 py-2 bg-zinc-50 border-b border-zinc-100`}>
        {["Status", "Place", "Type", "When"].map((label) => (
          <span key={label} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 truncate">
            {label}
          </span>
        ))}
        <span className="sr-only">Details</span>
      </div>
      <ul className="divide-y divide-zinc-100">
        {items.map((entry) => {
          const isHazard = entry.kind === "hazard";
          const highlighted = isHazard && highlightedHazardId === entry.item.id;
          const rowClass = `${ADVISORY_ROW} w-full text-left px-3 py-2.5 transition-colors hover:bg-zinc-50 ${
            highlighted ? "bg-blue-50" : "bg-white"
          }`;
          const cells = isHazard ? <HazardRowCells warning={entry.item} /> : <RouteRowCells route={entry.item} />;

          return (
            <li key={entry.key} id={isHazard ? `hazard-${entry.item.id}` : undefined}>
              <button
                type="button"
                onClick={() => (isHazard ? onSelectHazard(entry.item) : onSelectRoute(entry.item))}
                className={rowClass}
                aria-label={isHazard ? "View hazard details" : "View route details"}
              >
                {cells}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RouteRowCells({ route }) {
  const styles = getRouteStatusStyles(route.status);
  const place = [route.from, route.to].filter(Boolean).join(" → ");
  return (
    <>
      <StatusBadge className={styles.badge} label={route.statusLabel || styles.label} />
      <AdvisoryCell title={place}>{place}</AdvisoryCell>
      <AdvisoryCell title={route.subtitle}>{route.subtitle}</AdvisoryCell>
      <AdvisoryCell>—</AdvisoryCell>
      <ViewDetailsMark />
    </>
  );
}

function HazardRowCells({ warning }) {
  const styles = getDangerSeverityStyles(warning.severity);
  const when = formatWarningTimeRange(warning);
  return (
    <>
      <StatusBadge className={styles.badge} label={styles.label} />
      <AdvisoryCell title={warning.dangerous_location}>{warning.dangerous_location}</AdvisoryCell>
      <AdvisoryCell title={warning.danger_type}>{warning.danger_type}</AdvisoryCell>
      <AdvisoryCell title={when}>{when}</AdvisoryCell>
      <ViewDetailsMark />
    </>
  );
}

function StatusBadge({ className, label }) {
  return (
    <span className={`inline-flex max-w-full truncate text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded ${className}`}>
      {label}
    </span>
  );
}

export default function RoutesPageContent() {
  const { advisories, fetchAdvisories, loading: routesLoading, error: routesError } = useRouteAdvisoryStore();
  const { warnings, fetchWarnings, loading: hazardsLoading, error: hazardsError } = useDangerousLocationStore();
  const [mapReady, setMapReady] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedHazard, setSelectedHazard] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [highlightedHazardId, setHighlightedHazardId] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const loading = routesLoading || hazardsLoading;
  const error = routesError || hazardsError;

  useEffect(() => {
    fetchAdvisories();
    fetchWarnings();
  }, [fetchAdvisories, fetchWarnings]);

  useEffect(() => {
    setMapReady(true);
  }, []);

  const catalog = useMemo(() => buildRouteCatalog(advisories), [advisories]);

  const activeAreaHazards = useMemo(
    () => warnings.filter((w) => w.status === "Active" && w.is_public !== false),
    [warnings]
  );

  const urgentCount = catalog.affected.length + catalog.active.length + activeAreaHazards.filter((w) => w.severity !== "Caution").length;
  const hasTravelContent = !catalog.isEmpty || activeAreaHazards.length > 0;

  const showClosed = activeFilter === "all" || activeFilter === "urgent" || activeFilter === "closed";
  const showCaution = activeFilter === "all" || activeFilter === "urgent" || activeFilter === "caution";
  const showDetours = activeFilter === "all" || activeFilter === "detours";
  const showSafe = activeFilter === "all" || activeFilter === "safe";
  const showAreas = activeFilter === "all" || activeFilter === "urgent" || activeFilter === "areas";

  const publishedAdvisoryIds = useMemo(
    () => new Set(catalog.published.map((a) => a.id)),
    [catalog.published]
  );

  const focusAreas = useCallback(() => {
    setActiveFilter("areas");
  }, []);

  useTravelDeepLinks({
    loading,
    publishedAdvisoryIds,
    activeAreaHazards,
    basePath: "/routes",
    onFocusAreas: focusAreas,
  });

  useEffect(() => {
    const hazardId = searchParams.get("hazard");
    setHighlightedHazardId(hazardId || null);
  }, [searchParams]);

  const openRoute = useCallback((route) => setSelectedRoute(route), []);

  const closeRoute = useCallback(() => {
    setSelectedRoute(null);
    if (searchParams.get("route") || searchParams.get("hazard")) {
      router.replace("/routes", { scroll: false });
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

  const mapBlocked = !!selectedRoute;
  const areaItems =
    activeFilter === "urgent"
      ? activeAreaHazards.filter((warning) => warning.severity !== "Caution")
      : activeAreaHazards;

  const attentionGroups = [
    showClosed &&
      catalog.affected.length > 0 && {
        key: "closed",
        items: catalog.affected,
      },
    showCaution &&
      catalog.active.length > 0 && {
        key: "caution",
        items: catalog.active,
      },
    showAreas &&
      areaItems.length > 0 && {
        key: "areas",
        items: areaItems,
      },
  ].filter(Boolean);

  const openGroups = [
    showDetours &&
      catalog.alternative.length > 0 && {
        key: "detours",
        items: catalog.alternative,
      },
    showSafe &&
      catalog.safe.length > 0 && {
        key: "safe",
        items: catalog.safe,
      },
  ].filter(Boolean);

  const listItems = [...attentionGroups, ...openGroups].flatMap((group) =>
    group.items.map((item, index) => ({
      key: `${group.key}-${item?.id ?? index}`,
      kind: group.key === "areas" ? "hazard" : "route",
      item,
    }))
  );

  const visibleRouteIds = new Set(
    listItems.filter((entry) => entry.kind === "route").map((entry) => entry.item.advisoryId)
  );
  const visibleHazards = listItems.filter((entry) => entry.kind === "hazard").map((entry) => entry.item);
  const visibleRouteAdvisories = catalog.published.filter((advisory) => visibleRouteIds.has(advisory.id));
  const visibleMapWarnings = [
    ...visibleRouteAdvisories.map(advisoryToMapWarning).filter(Boolean),
    ...visibleHazards,
  ];

  return (
    <PublicPageShell>
      <InfoPageHero
        title={ROLE_INTERFACE.public.routes.title}
        description={ROLE_INTERFACE.public.routes.description}
      />

      <PublicPageContent>
        <RoleContextBanner helper={ROLE_INTERFACE.public.routes.helper} tone="info" />
        <AsyncState
          loading={loading}
          error={error}
          isEmpty={!loading && !error && !hasTravelContent}
          onRetry={() => {
            fetchAdvisories();
            fetchWarnings();
          }}
          loadingFallback={
            <div className="space-y-6">
              <AlertCardSkeletonList count={3} />
              <MapSkeleton height="h-[min(560px,70vh)] sm:h-[560px]" />
            </div>
          }
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
              description="The Daet Municipal Tourism Office has not published any active routes or area hazards right now. Check back before you head out."
            />
          }
        >
          <div className={portalLayout.stackPublic}>
            <PublicPanel title="Overview" subtitle="Route and hazard counts">
              <div className="grid grid-cols-6 gap-1.5 sm:gap-3 mb-4 min-w-0">
                <PublicStatCard compact className="col-span-2" value={catalog.safe.length} label="Safe Routes" accent="green" />
                <PublicStatCard compact className="col-span-2" value={catalog.active.length} label="Caution" accent="green" />
                <PublicStatCard compact className="col-span-2" value={catalog.affected.length} label="Closed / Avoid" accent="red" />
                <PublicStatCard compact className="col-span-3" value={catalog.alternative.length} label="Detours" accent="blue" />
                <PublicStatCard compact className="col-span-3" value={activeAreaHazards.length} label="Area Hazards" accent="red" />
              </div>

              {urgentCount > 0 && (
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-3 mb-4">
                  <AlertTriangle className="text-orange-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs font-black uppercase text-orange-700 tracking-widest">Check before you travel</p>
                    <p className="text-sm text-orange-900 font-medium mt-0.5">
                      {urgentCount} item{urgentCount > 1 ? "s" : ""} need attention. Those are listed first under Advisories.
                    </p>
                  </div>
                </div>
              )}

            </PublicPanel>

            <div className={portalLayout.splitGridPublic}>
              <PublicPanel
                title="Advisories"
                subtitle="Status, place, type, and when. View opens the full details."
                className="order-2 lg:order-1"
              >
                <label className="block mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
                    Category
                  </span>
                  <select
                    className={portalShell.select}
                    value={activeFilter}
                    onChange={(event) => setActiveFilter(event.target.value)}
                    aria-label="Category"
                  >
                    {FILTERS.map((filter) => (
                      <option key={filter.id} value={filter.id}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                </label>
                <AdvisoryFormList
                  items={listItems}
                  onSelectRoute={openRoute}
                  onSelectHazard={setSelectedHazard}
                  highlightedHazardId={highlightedHazardId}
                />
              </PublicPanel>

              <PublicPanel
                title="Travel map"
                subtitle="Route lines and hazard pins"
                className={`${portalLayout.panelFill} order-1 lg:order-2 ${mapBlocked ? "pointer-events-none opacity-40" : ""}`}
                noPadding
                bodyClassName={portalLayout.mapColumnBody}
              >
                {mapReady ? (
                  <CrisisHubMap
                    alerts={[]}
                    warnings={visibleMapWarnings}
                    routeAdvisories={visibleRouteAdvisories}
                    highlightRouteId={selectedRoute?.advisoryId}
                    heightClass={portalLayout.mapColumnFill}
                    showTouristSpots={false}
                    showSafeRoutePins
                    legendItems={ROUTES_MAP_LEGEND}
                  />
                ) : (
                  <MapSkeleton height={portalLayout.mapColumnFill} />
                )}
              </PublicPanel>
            </div>
          </div>
        </AsyncState>
      </PublicPageContent>

      <RouteDetailModal
        open={!!selectedRoute}
        route={selectedRoute}
        catalog={catalog}
        onClose={closeRoute}
        onSelectRoute={openRoute}
      />

      <PublicListModal
        open={!!selectedHazard}
        onClose={() => setSelectedHazard(null)}
        title="Area hazard"
        subtitle={selectedHazard?.dangerous_location}
      >
        {selectedHazard ? <DangerousLocationCard warning={selectedHazard} /> : null}
      </PublicListModal>
    </PublicPageShell>
  );
}
