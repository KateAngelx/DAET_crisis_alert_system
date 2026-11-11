"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PUBLIC_VISIBILITY, normalizePublicVisibility } from "@/lib/publicVisibility";

let cachedVisibility = null;

export function usePublicVisibility() {
  const [visibility, setVisibility] = useState(cachedVisibility || {
    ...DEFAULT_PUBLIC_VISIBILITY,
    rewardsEnabled: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/visibility")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.visibility) return;
        const next = {
          ...normalizePublicVisibility(data.visibility),
          rewardsEnabled: data.rewardsEnabled === true,
        };
        cachedVisibility = next;
        setVisibility(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return visibility;
}
