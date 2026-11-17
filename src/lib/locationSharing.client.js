"use client";

import { fetchWithFreshSession } from "@/lib/authSession";

/** Send a position at most this often while the app is open. */
const MIN_REPORT_INTERVAL_MS = 10 * 60 * 1000;
let lastReportedAt = 0;
let reporting = false;

/** True only when the browser already allows location, so the app never pops up a prompt on its own. */
async function locationAlreadyAllowed() {
  try {
    if (!navigator.permissions?.query) return false;
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state === "granted";
  } catch {
    return false;
  }
}

/** Ask the browser for the current position. Resolves to { latitude, longitude } or throws. */
export function getCurrentPosition({ timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This browser cannot share location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "Location permission was denied. Allow it in your browser settings to share your location."
              : "Could not read your location. Try again."
          )
        ),
      { enableHighAccuracy: false, timeout, maximumAge: 5 * 60 * 1000 }
    );
  });
}

/**
 * While a tourist has location sharing on, quietly save their position when the app is open.
 * Never prompts: if the browser has not already allowed location, it does nothing.
 */
export async function reportLocationIfSharing(user, { force = false } = {}) {
  if (typeof window === "undefined" || reporting) return;
  if (user?.role !== "tourist" || !user.location_sharing_enabled) return;
  if (!force && Date.now() - lastReportedAt < MIN_REPORT_INTERVAL_MS) return;
  if (document.visibilityState === "hidden") return;
  reporting = true;
  try {
    if (!(await locationAlreadyAllowed())) return;
    const position = await getCurrentPosition({ timeout: 10000 });
    const response = await fetchWithFreshSession("/api/auth/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(position),
    });
    if (response.ok) lastReportedAt = Date.now();
  } catch {
    /* location is optional; never interrupt the app */
  } finally {
    reporting = false;
  }
}
