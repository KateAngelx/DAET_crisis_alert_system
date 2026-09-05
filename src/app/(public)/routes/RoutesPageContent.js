"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle, AlertOctagon, Navigation, MapPin, Route, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { useDangerousLocationStore } from "@/app/store/dangerousLocationStore";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { RouteListCard } from "@/app/components/routes/RouteListCard";
import { RouteDetailModal } from "@/app/components/routes/RouteDetailModal";
import { DangerousLocationCard } from "@/app/components/danger/DangerousLocationCard";
import { InfoPageHero, PublicPageShell, PublicPageContent, publicLayout } from "@/app/components/InfoPageHero";
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
import { iconSize, statGrid } from "@/lib/designSystem";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "urgent", label: "Needs attention" },
  { id: "closed", label: "Closed" },
  { id: "caution", label: "Caution" },
  { id: "detours", label: "Detours" },
  { id: "areas", label: "Area hazards" },
  { id: "safe", label: "Safe" },
];

function RouteSection({ icon: Icon, iconClass, title, description, empty, emptyTone = "neutral", children }) {
  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-4 sm:p-5">
      <div className="mb-4">
        <h2 className={`${publicLayout.sectionTitle} flex items-center gap-2`}>
          <Icon className={iconClass} size={iconSize.section} /> {title}
        </h2>
        <p className="text-sm text-zinc-500 font-medium mt-1">{description}</p>
      </div>
      {empty ? (
        <p
          className={`text-sm font-medium p-4 rounded-xl ${
            emptyTone === "positive"
              ? "text-green-700 bg-green-50 border border-green-200"
              : "text-zinc-500 bg-zinc-50"
          }`}
        >
          {empty}
        </p>
      ) : (
        <div className={publicLayout.stack}>{children}</div>
      )}
    </section>
  );
}

export default function RoutesPageContent() {
  const { advisories, fetchAdvisories, loading: routesLoading, error: routesError } = useRouteAdvisoryStore();
  const { warnings, fetchWarnings, loading: hazardsLoading, error: hazardsError } = useDangerousLocationStore();
  const [mapReady, setMapReady] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
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

  return (
    <PublicPageShell>
      <InfoPageHero
        title={ROLE_INTERFACE.public.routes.title}
        description={ROLE_INTERFACE.public.routes.description}
      />

      <PublicPageContent>
        <section className={publicLayout.section}>
          <RoleContextBanner helper={ROLE_INTERFACE.public.routes.helper} tone="info" />
        </section>
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
              description="Daet LGU has not published any active routes or area hazards right now. Check back before you head out."
            />
          }
        >
          <section className={publicLayout.section}>
            <div className={`${statGrid.crisisHub} grid-cols-2 lg:grid-cols-5`}>
              <PublicStatCard compact value={catalog.safe.length} label="Safe Routes" accent="green" />
              <PublicStatCard compact value={catalog.active.length} label="Caution" accent="green" />
              <PublicStatCard compact value={catalog.affected.length} label="Closed / Avoid" accent="red" />
              <PublicStatCard compact value={catalog.alternative.length} label="Detours" accent="blue" />
              <PublicStatCard compact value={activeAreaHazards.length} label="Area Hazards" accent="red" />
            </div>
          </section>

          {urgentCount > 0 && (
            <section className={`${publicLayout.section} p-4 rounded-2xl bg-orange-50 border border-orange-200 flex items-start gap-3`}>
              <AlertTriangle className="text-orange-600 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-black uppercase text-orange-700 tracking-widest">Check before you travel</p>
                <p className="text-sm text-orange-900 font-medium mt-1">
                  {urgentCount} item{urgentCount > 1 ? "s" : ""} need attention — review closed routes, caution areas, and area hazards below.
                </p>
              </div>
            </section>
          )}

          <section className={`${publicLayout.section} flex flex-wrap gap-2`}>
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                  activeFilter === filter.id
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </section>

          <section className={`${publicLayout.section} grid grid-cols-1 xl:grid-cols-2 gap-6 items-start`}>
            <div className="space-y-4 order-2 xl:order-1">
              {showClosed && (
                <RouteSection
                  icon={AlertOctagon}
                  iconClass="text-red-600"
                  title="Closed / Avoid"
                  description="Do not use these routes unless LGU or your guide directs otherwise."
                  empty={catalog.affected.length === 0 ? "No routes are currently closed or marked unsafe." : null}
                  emptyTone="positive"
                >
                  {catalog.affected.map((route) => (
                    <RouteListCard key={route.id} route={route} onSelect={openRoute} />
                  ))}
                </RouteSection>
              )}

              {showCaution && (
                <RouteSection
                  icon={CheckCircle}
                  iconClass="text-orange-500"
                  title="Open with Caution"
                  description="Passable routes where LGU advises extra care."
                  empty={catalog.active.length === 0 ? "No caution-level advisories are active." : null}
                >
                  {catalog.active.map((route) => (
                    <RouteListCard key={route.id} route={route} onSelect={openRoute} />
                  ))}
                </RouteSection>
              )}

              {showDetours && (
                <RouteSection
                  icon={Navigation}
                  iconClass="text-blue-600"
                  title="Recommended Detours"
                  description="Safer alternative paths when a primary route is affected."
                  empty={catalog.alternative.length === 0 ? "No detours are published at this time." : null}
                >
                  {catalog.alternative.map((route) => (
                    <RouteListCard key={route.id} route={route} onSelect={openRoute} />
                  ))}
                </RouteSection>
              )}

              {showAreas && (
                <RouteSection
                  icon={AlertOctagon}
                  iconClass="text-red-600"
                  title="Area Hazards"
                  description="Specific places marked unsafe — follow alternative routes shown on each card."
                  empty={activeAreaHazards.length === 0 ? "No area hazards are active right now." : null}
                  emptyTone="positive"
                >
                  {activeAreaHazards.map((warning) => (
                    <DangerousLocationCard
                      key={warning.id}
                      warning={warning}
                      highlighted={highlightedHazardId === warning.id}
                    />
                  ))}
                </RouteSection>
              )}

              {showSafe && (
                <RouteSection
                  icon={ShieldCheck}
                  iconClass="text-green-600"
                  title="Safe Routes"
                  description="LGU-published routes that are open and safe to use."
                  empty={catalog.safe.length === 0 ? "No routes are explicitly marked Safe right now." : null}
                >
                  {catalog.safe.map((route) => (
                    <RouteListCard key={route.id} route={route} onSelect={openRoute} />
                  ))}
                </RouteSection>
              )}
            </div>

            <div className={`order-1 xl:order-2 xl:sticky xl:top-24 ${mapBlocked ? "pointer-events-none opacity-40" : ""}`}>
              <h2 className={`${publicLayout.sectionTitle} flex items-center gap-2 mb-3`}>
                <MapPin className="text-blue-600" size={iconSize.section} /> Travel Map
              </h2>
              <p className="text-xs text-zinc-500 font-medium mb-3">
                Route lines follow drivable roads. Pins mark route hazards and area warnings.
              </p>
              {mapReady ? (
                <CrisisHubMap
                  alerts={[]}
                  warnings={allMapWarnings}
                  routeAdvisories={catalog.published}
                  highlightRouteId={selectedRoute?.advisoryId}
                  heightClass="h-[min(560px,70vh)] sm:h-[560px]"
                  showTouristSpots={false}
                  showSafeRoutePins
                />
              ) : (
                <MapSkeleton height="h-[min(560px,70vh)] sm:h-[560px]" />
              )}
            </div>
          </section>
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
