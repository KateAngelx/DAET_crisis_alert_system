"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    if (!map) return undefined;

    const invalidate = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* ignore */
      }
    };

    const timer = window.setTimeout(invalidate, 120);
    window.addEventListener("resize", invalidate);

    const container = map.getContainer();
    let observer;
    if (container && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => invalidate());
      observer.observe(container);
    }

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", invalidate);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}
