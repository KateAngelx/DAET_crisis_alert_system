"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { getLeaflet } from "@/lib/leafletClient";

/** True once in the browser and Leaflet has loaded (maps can render). */
export function useLeafletReady() {
  const hydrated = useHydrated();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated) {
      setReady(false);
      return;
    }
    let cancelled = false;
    getLeaflet()
      .then((L) => {
        if (!cancelled) setReady(Boolean(L));
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  return hydrated && ready;
}