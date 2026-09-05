"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { geocodeLocation } from "@/lib/geocodeLocation";
import { createCategoryPinIcon, TOURIST_LANDMARKS } from "@/lib/mapPinUtils";

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

export function TouristLandmarkMarkers() {
  const [coordsById, setCoordsById] = useState({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const resolved = {};
      for (const landmark of TOURIST_LANDMARKS) {
        const coords = await geocodeLocation(landmark.location);
        if (coords) resolved[landmark.id] = coords;
      }
      if (!cancelled) setCoordsById(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return TOURIST_LANDMARKS.map((landmark) => {
    const position = coordsById[landmark.id];
    if (!position) return null;

    return (
      <Marker key={landmark.id} position={position} icon={createCategoryPinIcon("tourist")}>
        <Popup>
          <div className="p-2 text-left text-black">
            <p className="text-[10px] font-black uppercase text-purple-700">Tourist Location</p>
            <p className="font-bold text-sm">{landmark.name}</p>
          </div>
        </Popup>
      </Marker>
    );
  });
}
