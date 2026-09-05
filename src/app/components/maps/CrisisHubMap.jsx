"use client";

import React from "react";

import dynamic from "next/dynamic";

import "leaflet/dist/leaflet.css";

import { MapLegend } from "@/app/components/maps/MapLegend";

import { useLeafletReady } from "@/lib/useLeafletReady";

import { ROUTES_MAP_LEGEND } from "@/lib/mapPinUtils";



const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });

const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });

const MapResizeFix = dynamic(

  () => import("@/app/components/maps/MapResizeFix").then((m) => m.MapResizeFix),

  { ssr: false }

);

const CrisisAlertMapMarkers = dynamic(

  () => import("@/app/components/maps/CrisisAlertMapMarkers").then((m) => m.CrisisAlertMapMarkers),

  { ssr: false }

);

const DangerousLocationMapMarkers = dynamic(

  () => import("@/app/components/maps/DangerousLocationMapMarkers").then((m) => m.DangerousLocationMapMarkers),

  { ssr: false }

);

const TouristLandmarkMarkers = dynamic(

  () => import("@/app/components/maps/TouristLandmarkMarkers").then((m) => m.TouristLandmarkMarkers),

  { ssr: false }

);

const RouteAdvisoryPolylines = dynamic(

  () => import("@/app/components/maps/RouteAdvisoryPolylines").then((m) => m.RouteAdvisoryPolylines),

  { ssr: false }

);



const DAET_CENTER = [14.1122, 122.9553];



export function CrisisHubMap({

  alerts = [],

  warnings = [],

  routeAdvisories = [],

  highlightRouteId = null,

  center = DAET_CENTER,

  zoom = 13,

  heightClass = "h-[min(480px,70vh)] sm:h-[480px]",

  showLegend = true,

  legendItems = null,

  showTouristSpots = true,

  showSafeRoutePins = true,

  showWarnings = true,

  showRoutePaths = true,

  mapKey,

}) {

  const leafletReady = useLeafletReady();

  const resolvedLegendItems =
    legendItems || (showRoutePaths && routeAdvisories.length > 0 ? ROUTES_MAP_LEGEND : null);



  return (

    <div

      className={`leaflet-map-shell relative bg-zinc-50 rounded-3xl border border-zinc-200 overflow-hidden min-h-[280px] ${heightClass}`}

    >

      {!leafletReady ? (

        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 animate-pulse">

          <p className="text-xs font-black uppercase text-zinc-400 tracking-widest">Loading map…</p>

        </div>

      ) : (

        <MapContainer

          key={mapKey || `hub-map-${alerts.length}-${warnings.length}-${routeAdvisories.length}`}

          center={center}

          zoom={zoom}

          style={{ height: "100%", width: "100%", minHeight: "280px" }}

          whenReady={(map) => {
            try {
              map.target.invalidateSize({ animate: false });
            } catch {
              /* ignore */
            }
          }}

        >

          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />

          <MapResizeFix />

          {showTouristSpots && <TouristLandmarkMarkers />}

          <CrisisAlertMapMarkers alerts={alerts} />

          {showRoutePaths && routeAdvisories.length > 0 && (
            <RouteAdvisoryPolylines advisories={routeAdvisories} highlightId={highlightRouteId} />
          )}

          {showWarnings && (

            <DangerousLocationMapMarkers warnings={warnings} showSafeRoutePins={showSafeRoutePins} />

          )}

        </MapContainer>

      )}

      {showLegend && leafletReady && (

        <div className="absolute bottom-3 left-3 z-[3] max-w-[200px]">

          <MapLegend compact items={resolvedLegendItems || undefined} />

        </div>

      )}

    </div>

  );

}


