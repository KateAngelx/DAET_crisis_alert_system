"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Handles ?hazard= and legacy ?route= IDs that belong to area hazards (not route advisories).
 */
export function useTravelDeepLinks({
  loading,
  publishedAdvisoryIds,
  activeAreaHazards,
  basePath,
  onFocusAreas,
  onOpenRoute,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const hazardId = searchParams.get("hazard");
    if (hazardId) {
      onFocusAreas?.();
      const exists = activeAreaHazards.some((w) => w.id === hazardId);
      if (exists) {
        requestAnimationFrame(() => {
          document.getElementById(`hazard-${hazardId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
      return;
    }

    const routeId = searchParams.get("route");
    if (!routeId) return;

    if (publishedAdvisoryIds.has(routeId)) return;

    const legacyHazard = activeAreaHazards.find((w) => w.id === routeId);
    if (legacyHazard) {
      onFocusAreas?.();
      router.replace(`${basePath}?hazard=${routeId}`, { scroll: false });
    }
  }, [
    loading,
    searchParams,
    publishedAdvisoryIds,
    activeAreaHazards,
    basePath,
    router,
    onFocusAreas,
    onOpenRoute,
  ]);
}
