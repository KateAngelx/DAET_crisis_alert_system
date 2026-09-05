"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureRoadSnappedPath, hasRoutePath, isLikelyStraightLinePath } from "@/lib/routeGeometryUtils";

/**
 * Ensures advisories have road-following route_path (OSRM), not straight lines.
 */
export function useResolvedRouteAdvisories(advisories = []) {
  const advisoryKey = useMemo(
    () =>
      advisories
        .map(
          (a) =>
            `${a.id}:${a.from_location}:${a.to_location}:${a.via_location}:${JSON.stringify(a.route_path)}`
        )
        .join("|"),
    [advisories]
  );

  const [resolved, setResolved] = useState(advisories);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const enriched = await Promise.all(
        advisories.map(async (advisory) => {
          const needsRoadSnap =
            !hasRoutePath(advisory) || isLikelyStraightLinePath(advisory);

          if (!needsRoadSnap) return advisory;

          const path = await ensureRoadSnappedPath(advisory);
          if (path.length < 2) return advisory;
          return { ...advisory, route_path: path };
        })
      );

      if (!cancelled) {
        setResolved(enriched);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [advisoryKey, advisories]);

  return resolved;
}
