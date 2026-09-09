"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";

const SESSION_KEY = "connect_daet_analytics_session";
const DEDUPE_MS = 30 * 60 * 1000;

function getOrCreateSessionId() {
  if (typeof window === "undefined") return null;
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function shouldTrack(path, sessionId) {
  if (typeof window === "undefined") return false;
  const key = `pv:${sessionId}:${path}`;
  const last = Number(sessionStorage.getItem(key) || 0);
  if (Date.now() - last < DEDUPE_MS) return false;
  sessionStorage.setItem(key, String(Date.now()));
  return true;
}

export function PublicPageTracker() {
  const pathname = usePathname();
  const lastPath = useRef(null);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;

    const sessionId = getOrCreateSessionId();
    if (!sessionId || !shouldTrack(pathname, sessionId)) return;

    (async () => {
      const headers = { "Content-Type": "application/json" };
      const session = await getActiveSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      fetch("/api/analytics/page-view", {
        method: "POST",
        headers,
        body: JSON.stringify({
          path: pathname,
          sessionId,
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
        }),
      }).catch(() => {});
    })();
  }, [pathname]);

  return null;
}
