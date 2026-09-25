"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { X, MapPin, Navigation, ShieldAlert, Clock, Route, ExternalLink, AlertTriangle, Download } from "lucide-react";
import { AlternativeRouteDisplay } from "@/app/components/danger/AlternativeRouteDisplay";
import { Card } from "@/app/components/ui/Card";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { getRouteStatusStyles, getLinkedAlternatives } from "@/lib/routesUtils";
import { getPrimaryMapsLink, getRouteMapsLinks } from "@/lib/routeMapsLinks";
import { buildGpxFromAdvisory, downloadGpx, hasRoutePath, parseRoutePath } from "@/lib/routeGeometryUtils";
import { useResolvedRouteAdvisories } from "@/lib/useResolvedRouteAdvisories";
import { iconSize, typography } from "@/lib/designSystem";

function advisoryToAltDisplay(advisory) {
  if (!advisory) return null;
  return {
    current_location: advisory.from_location,
    alternative_route: advisory.via_location,
    destination: advisory.to_location,
  };
}

function MapsActionButton({ href, label, variant = "primary" }) {
  if (!href) return null;

  const styles =
    variant === "secondary"
      ? "bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
      : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors ${styles}`}
    >
      <ExternalLink size={14} />
      {label}
    </a>
  );
}

export function RouteDetailContent({ route, catalog, onSelectRoute }) {
  if (!route) return null;

  const styles = getRouteStatusStyles(route.status);
  const mapsLinks = getRouteMapsLinks(route);
  const primaryMapsLink = getPrimaryMapsLink(route);
  const advisory = route.advisory || route.warning;
  const resolvedAdvisories = useResolvedRouteAdvisories(advisory ? [advisory] : []);
  const resolvedAdvisory = resolvedAdvisories[0] || advisory;
  const pathPoints = useMemo(() => parseRoutePath(resolvedAdvisory), [resolvedAdvisory]);
  const pathCenter = pathPoints[0] || null;
  const linkedAlternatives =
    catalog && route.advisoryId && route.view !== "alternative"
      ? getLinkedAlternatives(catalog, route.advisoryId)
      : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${styles.badge}`}>
          {route.statusLabel || styles.label}
        </span>
        {route.subtitle && (
          <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-zinc-100 text-zinc-600">
            {route.subtitle}
          </span>
        )}
      </div>

      <h2 className={typography.heroTitle}>{route.title}</h2>

      {(route.updatedAtLabel || route.expiry?.text) && (
        <div className="space-y-2">
          {route.updatedAtLabel && (
            <p className="text-xs font-bold text-zinc-500 flex items-center gap-1.5">
              <Clock size={iconSize.inlineSm} /> {route.updatedAtLabel}
            </p>
          )}
          {route.expiry?.text && (
            <p
              className={`text-xs font-medium flex items-start gap-1.5 p-3 rounded-xl ${
                route.expiry.tone === "expired"
                  ? "bg-red-50 text-red-800 border border-red-100"
                  : route.expiry.tone === "active"
                    ? "bg-green-50 text-green-800 border border-green-100"
                    : "bg-zinc-50 text-zinc-600 border border-zinc-100"
              }`}
            >
              {route.expiry.tone === "expired" ? (
                <AlertTriangle size={iconSize.inlineSm} className="shrink-0 mt-0.5" />
              ) : (
                <Clock size={iconSize.inlineSm} className="shrink-0 mt-0.5" />
              )}
              {route.expiry.text}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`p-4 rounded-2xl ${styles.bg} border ${styles.border}`}>
          <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Affected location</p>
          <p className="font-bold text-sm flex items-center gap-1.5">
            <MapPin size={iconSize.inlineSm} /> {route.affectedLocation || route.from}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
          <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Destination</p>
          <p className="font-bold text-sm flex items-center gap-1.5">
            <Navigation size={iconSize.inlineSm} /> {route.to}
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
        <p className="text-[10px] font-black uppercase text-zinc-500 mb-1 flex items-center gap-1.5">
          <Route size={iconSize.inlineSm} /> Your route
        </p>
        <p className="font-bold text-sm text-zinc-800">
          {route.from} → {route.to}
        </p>
        {route.via && (
          <p className="text-xs text-zinc-500 font-medium mt-1">Via {route.via}</p>
        )}
      </div>

      {route.timeRange && (
        <p className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
          <Clock size={iconSize.inlineSm} /> Advisory period: {route.timeRange}
        </p>
      )}

      {resolvedAdvisory && hasRoutePath(resolvedAdvisory) && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase text-zinc-500">Route path on map</p>
          <CrisisHubMap
            alerts={[]}
            warnings={[]}
            routeAdvisories={[resolvedAdvisory]}
            highlightRouteId={resolvedAdvisory.id}
            center={pathCenter || undefined}
            zoom={pathPoints.length >= 2 ? 12 : 13}
            heightClass="h-[220px] sm:h-[240px]"
            showTouristSpots={false}
            showWarnings={false}
            showSafeRoutePins={false}
            showLegend={false}
          />
          <button
            type="button"
            onClick={() => {
              const gpx = buildGpxFromAdvisory(resolvedAdvisory, route.title);
              if (!gpx) return;
              const slug = (route.title || "route-advisory")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
              downloadGpx(slug || "route-advisory", gpx);
            }}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors"
          >
            <Download size={14} />
            Download GPX for guides
          </button>
          <p className="text-[10px] text-zinc-400 font-medium">
            Import the GPX file into Google Maps, OsmAnd, or a GPS device for offline navigation.
          </p>
        </div>
      )}

      <div className={`p-4 rounded-2xl ${styles.bg}`}>
        <p className="text-[10px] font-black uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
          <ShieldAlert size={iconSize.inlineSm} /> What happened
        </p>
        <p className={`text-sm font-medium leading-relaxed ${styles.text}`}>{route.reason}</p>
      </div>

      {advisory && route.view !== "alternative" && advisory.via_location && route.view === "affected" && (
        <AlternativeRouteDisplay warning={advisoryToAltDisplay(advisory)} />
      )}

      {linkedAlternatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase text-blue-700">Published detours for this route</p>
          {linkedAlternatives.map((alt) => (
            <button
              key={alt.id}
              type="button"
              onClick={() => onSelectRoute?.(alt)}
              className="w-full text-left p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors"
            >
              <p className="text-sm font-bold text-blue-900">{alt.title}</p>
              <p className="text-xs text-blue-700 mt-1">Tap to view detour details</p>
            </button>
          ))}
        </div>
      )}

      {route.view === "alternative" && route.alternativeRoute && (
        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60">
          <p className="text-[10px] font-black uppercase text-blue-700 mb-2">Recommended alternative</p>
          <p className="text-sm font-bold text-blue-900">{route.alternativeRoute}</p>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
        <p className="text-[10px] font-black uppercase text-blue-700 mb-2">What you should do</p>
        <p className="text-sm text-blue-900 font-medium leading-relaxed">{route.recommendedAction}</p>
      </div>

      {(primaryMapsLink || mapsLinks.alternative || mapsLinks.destination) && (
        <div className="p-4 rounded-2xl border border-zinc-200 bg-white space-y-3">
          <p className="text-[10px] font-black uppercase text-zinc-500">Navigate with Google Maps</p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <MapsActionButton
              href={primaryMapsLink}
              label={
                route.view === "alternative"
                  ? "Open alternative route"
                  : route.view === "affected"
                    ? "Open safer route"
                    : "Open route directions"
              }
            />
            {route.view !== "alternative" && mapsLinks.alternative && mapsLinks.alternative !== primaryMapsLink && (
              <MapsActionButton href={mapsLinks.alternative} label="Open alternative" variant="secondary" />
            )}
            {mapsLinks.destination && mapsLinks.destination !== primaryMapsLink && (
              <MapsActionButton href={mapsLinks.destination} label="Open destination" variant="secondary" />
            )}
          </div>
          <p className="text-[10px] text-zinc-400 font-medium">
            Opens Google Maps in a new tab. Follow tourism office and guide instructions on the ground.
          </p>
        </div>
      )}
    </div>
  );
}

export function RouteDetailModal({ open, route, catalog, onClose, onSelectRoute }) {
  const scrollLoggedRef = useRef(false);

  useEffect(() => {
    scrollLoggedRef.current = false;
  }, [open, route?.advisoryId, route?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !route) return null;

  const styles = getRouteStatusStyles(route.status);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-detail-title"
    >
      <div
        className="relative z-[2001] max-w-2xl w-full max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Card
          className={`p-0 flex flex-col max-h-[90vh] overflow-hidden border-2 ${styles.border} shadow-2xl animate-in zoom-in-95 duration-200`}
        >
          <div className="shrink-0 bg-white rounded-t-2xl border-b border-zinc-100 px-6 py-4 flex items-start justify-between gap-4">
            <p id="route-detail-title" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Route advisory details
            </p>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors shrink-0"
              aria-label="Close route details"
            >
              <X size={20} />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto p-6 bg-white"
            onScroll={(e) => {
            }}
          >
            <RouteDetailContent route={route} catalog={catalog} onSelectRoute={onSelectRoute} />
          </div>
          <div className="shrink-0 bg-white rounded-b-2xl border-t border-zinc-100 p-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest"
            >
              Close
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
