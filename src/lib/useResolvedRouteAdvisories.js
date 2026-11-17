"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ensureRoadSnappedPath, hasRoutePath, isLikelyStraightLinePath, parseRoutePath } from "@/lib/routeGeometryUtils";

const roadPathCache = new Map();

function pathSignature(advisory) {
  const points = parseRoutePath(advisory);
  if (!points.length) return "0";
  return `${points.length}:${points[0].join(",")}:${points[points.length - 1].join(",")}`;
}

/** Includes Via and the stored path, so a changed route never shows an old cached line. */
function advisoryCacheKey(advisory) {
  return `${advisory?.id}:${advisory?.from_location}:${advisory?.to_location}:${advisory?.via_location}:${pathSignature(advisory)}`;
}

function rememberRoadPath(advisory) {
  const cacheKey = advisoryCacheKey(advisory);
  const cached = roadPathCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const storedCount = parseRoutePath(advisory).length;
  const coarse = storedCount > 0 && storedCount < 24;
  const needsRoadSnap = coarse || !hasRoutePath(advisory) || isLikelyStraightLinePath(advisory);
  if (!needsRoadSnap) {
    roadPathCache.set(cacheKey, advisory.route_path);
    return Promise.resolve(advisory.route_path);
  }

  const pending = ensureRoadSnappedPath(advisory)
    .then((path) => {
      if (path.length >= 2 && !isLikelyStraightLinePath(path)) {
        roadPathCache.set(cacheKey, path);
        return path;
      }
      roadPathCache.delete(cacheKey);
      return path.length >= 2 ? path : advisory.route_path;
    })
    .catch(() => {
      roadPathCache.delete(cacheKey);
      return advisory.route_path;
    });

  roadPathCache.set(cacheKey, pending);
  return pending;
}

/**
 * Ensures advisories have road-following route_path (OSRM), not straight lines.
 * Requests are cached so opening a details map does not refetch the same road.
 */
export function useResolvedRouteAdvisories(advisories = []) {
  const advisoryKey = useMemo(
    () => advisories.map((advisory) => advisoryCacheKey(advisory)).join("|"),
    [advisories]
  );
  const advisoriesRef = useRef(advisories);
  useEffect(() => {
    advisoriesRef.current = advisories;
  });

  const [resolved, setResolved] = useState(advisories);

  useEffect(() => {
    const current = advisoriesRef.current;
    let cancelled = false;

    (async () => {
      const enriched = await Promise.all(
        current.map(async (advisory) => {
          const path = await rememberRoadPath(advisory);
          if (!path || (Array.isArray(path) && path.length < 2)) return advisory;
          return { ...advisory, route_path: path };
        })
      );

      if (!cancelled) setResolved(enriched);
    })();

    return () => {
      cancelled = true;
    };
  }, [advisoryKey]);

  return resolved;
}
