"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Route, AlertTriangle, ChevronDown } from "lucide-react";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { useDangerousLocationStore } from "@/app/store/dangerousLocationStore";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { RouteListCard } from "@/app/components/routes/RouteListCard";
import { RouteDetailModal } from "@/app/components/routes/RouteDetailModal";
import { DangerousLocationListCard } from "@/app/components/danger/DangerousLocationListCard";
import { InfoPageHero, PublicPageShell, PublicPageContent, PublicPanel, publicLayout } from "@/app/components/InfoPageHero";
import { AsyncState, ErrorState, EmptyState } from "@/app/components/ui/AsyncState";
import { AlertCardSkeletonList, MapSkeleton } from "@/app/components/ui/Skeletons";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import {
  buildRouteCatalog,
  findRouteItem,
  getRouteItemFromAdvisory,
  resolveRouteItemView,
} from "@/lib/routesUtils";
import { advisoryToMapWarning } from "@/lib/routeAdvisoryUtils";
import { useTravelDeepLinks } from "@/lib/useTravelDeepLinks";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { iconSize, statGrid, portalLayout } from "@/lib/designSystem";
import { PublicCardListPreview } from "@/app/components/shell/PublicCardListPreview";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "urgent", label: "Needs attention" },
  { id: "closed", label: "Closed" },
  { id: "caution", label: "Caution" },
  { id: "detours", label: "Detours" },
  { id: "areas", label: "Area hazards" },
  { id: "safe", label: "Safe" },
];

function RouteAdvisoryGroup({
  title,
  description,
  empty,
  emptyTone = "neutral",
  collapsible,
  defaultOpen = false,
  children,
}) {
  const emptyBlock = empty ? (
    <p
      className={`text-sm font-medium p-3 rounded-xl ${
        emptyTone === "positive"
          ? "text-green-700 bg-green-50 border border-green-200"
          : "text-zinc-500 bg-zinc-50 border border-zinc-100"
      }`}
    >
      {empty}
    </p>
  ) : null;

  if (!collapsible) {
    return (
      <div className={publicLayout.stackTight}>
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">{title}</h3>
          {description ? <p className="text-xs text-zinc-400 font-medium mt-0.5">{description}</p> : null}
        </div>
        {empty ? emptyBlock : <div className={publicLayout.stackTight}>{children}</div>}
      </div>
    );
  }

  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-zinc-200 bg-zinc-50/40 overflow-hidden group"
    >
      <summary className="list-none cursor-pointer px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 text-left">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-700">{title}</span>
          {description ? <p className="text-[11px] text-zinc-400 font-medium mt-0.5">{description}</p> : null}
        </div>
        <ChevronDown className="shrink-0 text-zinc-400 group-open:rotate-180 transition-transform mt-0.5" size={16} />
      </summary>
      <div className="px-3 pb-3 border-t border-zinc-100">
        {empty ? emptyBlock : <div className={`${publicLayout.stackTight} pt-3`}>{children}</div>}
      </div>
    </details>
  );
}

export default function RoutesPageContent() {
  const { advisories, fetchAdvisories, loading: routesLoading, error: routesError } = useRouteAdvisoryStore();
  const { warnings, fetchWarnings, loading: hazardsLoading, error: hazardsError } = useDangerousLocationStore();
  const [mapReady, setMapReady] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [activeFilter, setActiveFilter] = useState("urgent");
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

  useEffect(() => {
  }, []);

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
            <PublicPanel title="Overview & filters" subtitle="Counts and category filters">
              <div className={`${statGrid.crisisHub} grid-cols-2 lg:grid-cols-5 mb-4`}>
                <PublicStatCard compact value={catalog.safe.length} label="Safe Routes" accent="green" />
                <PublicStatCard compact value={catalog.active.length} label="Caution" accent="green" />
                <PublicStatCard compact value={catalog.affected.length} label="Closed / Avoid" accent="red" />
                <PublicStatCard compact value={catalog.alternative.length} label="Detours" accent="blue" />
                <PublicStatCard compact value={activeAreaHazards.length} label="Area Hazards" accent="red" />
              </div>

              {urgentCount > 0 && (
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-3 mb-4">
                  <AlertTriangle className="text-orange-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs font-black uppercase text-orange-700 tracking-widest">Check before you travel</p>
                    <p className="text-sm text-orange-900 font-medium mt-0.5">
                      {urgentCount} item{urgentCount > 1 ? "s" : ""} need attention — use filters or expand categories below.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                      activeFilter === filter.id
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </PublicPanel>

            <div className={portalLayout.splitGridPublic}>
              <PublicPanel
                title="Advisories"
                subtitle={
                  activeFilter === "all"
                    ? "Expand a category — detours and safe routes stay collapsed"
                    : "Showing selected category"
                }
                className={`${portalLayout.panelFill} order-2 lg:order-1`}
                bodyClassName={portalLayout.panelBodyStack}
              >
                <div className={`${publicLayout.stackTight} ${portalLayout.listScrollPane}`}>
                  {showClosed && (
                    <RouteAdvisoryGroup
                      title="Closed / Avoid"
                      description="Do not use unless the tourism office or your guide directs otherwise."
                      empty={catalog.affected.length === 0 ? "No routes are currently closed or marked unsafe." : null}
                      emptyTone="positive"
                      collapsible={activeFilter === "all"}
                      defaultOpen={catalog.affected.length > 0}
                    >
                      <PublicCardListPreview
                        items={catalog.affected}
                        modalTitle="Closed / Avoid"
                        renderItem={(route) => <RouteListCard route={route} onSelect={openRoute} />}
                      />
                    </RouteAdvisoryGroup>
                  )}

                  {showCaution && (
                    <RouteAdvisoryGroup
                      title="Open with Caution"
                      description="Passable routes where the tourism office advises extra care."
                      empty={catalog.active.length === 0 ? "No caution-level advisories are active." : null}
                      collapsible={activeFilter === "all"}
                      defaultOpen={catalog.active.length > 0}
                    >
                      <PublicCardListPreview
                        items={catalog.active}
                        modalTitle="Open with Caution"
                        renderItem={(route) => <RouteListCard route={route} onSelect={openRoute} />}
                      />
                    </RouteAdvisoryGroup>
                  )}

                  {showDetours && (
                    <RouteAdvisoryGroup
                      title="Recommended Detours"
                      description="Safer alternatives when a primary route is affected."
                      empty={catalog.alternative.length === 0 ? "No detours are published at this time." : null}
                      collapsible={activeFilter === "all"}
                      defaultOpen={false}
                    >
                      <PublicCardListPreview
                        items={catalog.alternative}
                        modalTitle="Recommended Detours"
                        renderItem={(route) => <RouteListCard route={route} onSelect={openRoute} />}
                      />
                    </RouteAdvisoryGroup>
                  )}

                  {showAreas && (
                    <RouteAdvisoryGroup
                      title="Area Hazards"
                      description="Unsafe places — follow alternatives on each card."
                      empty={activeAreaHazards.length === 0 ? "No area hazards are active right now." : null}
                      emptyTone="positive"
                      collapsible={activeFilter === "all"}
                      defaultOpen={activeAreaHazards.length > 0}
                    >
                      <PublicCardListPreview
                        items={activeAreaHazards}
                        modalTitle="Area Hazards"
                        renderItem={(warning) => (
                          <DangerousLocationListCard
                            warning={warning}
                            highlighted={highlightedHazardId === warning.id}
                          />
                        )}
                      />
                    </RouteAdvisoryGroup>
                  )}

                  {showSafe && (
                    <RouteAdvisoryGroup
                      title="Safe Routes"
                      description="Tourism office–published routes that are open and safe."
                      empty={catalog.safe.length === 0 ? "No routes are explicitly marked Safe right now." : null}
                      collapsible={activeFilter === "all"}
                      defaultOpen={false}
                    >
                      <PublicCardListPreview
                        items={catalog.safe}
                        modalTitle="Safe Routes"
                        renderItem={(route) => <RouteListCard route={route} onSelect={openRoute} />}
                      />
                    </RouteAdvisoryGroup>
                  )}
                </div>
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
                    warnings={allMapWarnings}
                    routeAdvisories={catalog.published}
                    highlightRouteId={selectedRoute?.advisoryId}
                    heightClass={portalLayout.mapColumnFill}
                    showTouristSpots={false}
                    showSafeRoutePins
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
    </PublicPageShell>
  );
}
