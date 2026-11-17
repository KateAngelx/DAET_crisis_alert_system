"use client";

import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import {
  ALERT_TARGET_OPTIONS,
  DEFAULT_RADIUS_KM,
  RADIUS_CHOICES_KM,
  normalizeTargetScope,
} from "@/lib/alertTargeting";
import { fetchWithFreshSession } from "@/lib/authSession";
import { HelpTip } from "@/app/components/ui/HelpTip";

/** Live "about N tourists will get this" using the same rules as the broadcast. */
function useAudienceCount({ scope, radiusKm, latitude, longitude, location, title }) {
  const [state, setState] = useState({ key: "", result: null });
  const key = JSON.stringify([scope, radiusKm, latitude, longitude, location, title]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetchWithFreshSession("/api/crisis/alerts/audience-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_scope: scope, target_radius_km: radiusKm, latitude, longitude, location, title }),
        });
        const data = await response.json().catch(() => null);
        if (!cancelled) setState({ key, result: response.ok ? data : null });
      } catch {
        if (!cancelled) setState({ key, result: null });
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return state.key === key ? state.result : undefined;
}

/** "Who gets notified" choice for a crisis alert broadcast. */
export function AlertTargetSelect({ value, onChange, radiusKm, onRadiusChange, severity, latitude, longitude, location, title }) {
  const current = normalizeTargetScope(value);
  const option = ALERT_TARGET_OPTIONS.find((o) => o.value === current);
  const radius = Number(radiusKm) || DEFAULT_RADIUS_KM;
  const count = useAudienceCount({ scope: current, radiusKm: radius, latitude, longitude, location, title });

  let countText = "Counting tourists…";
  if (count === null) countText = "Could not count tourists right now.";
  else if (count?.available === false) countText = "Narrow targeting needs the latest database update; alerts go to everyone.";
  else if (count) countText = `About ${count.targeted} of ${count.total} tourist${count.total === 1 ? "" : "s"} will get this.`;

  return (
    <div className="space-y-1">
      <label htmlFor="alert-target-scope" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">
        Who gets notified
        <HelpTip label="targeting">Everyone: all registered tourists. In Daet now: tourists whose location, visit dates, tour or recent app use say they are here. Near the pin: within the distance you pick. Tour groups: groups going to the named place.</HelpTip>
      </label>
      <div className="flex gap-2">
        <select
          id="alert-target-scope"
          className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500"
          value={current}
          onChange={(event) => onChange(event.target.value)}
        >
          {ALERT_TARGET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {current === "radius" ? (
          <select
            aria-label="Distance from the alert pin"
            className="w-28 shrink-0 p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500"
            value={radius}
            onChange={(event) => onRadiusChange?.(Number(event.target.value))}
          >
            {RADIUS_CHOICES_KM.map((km) => (
              <option key={km} value={km}>{km} km</option>
            ))}
          </select>
        ) : null}
      </div>
      <p className="text-[10px] font-medium text-zinc-500">
        {option?.description} Guides and the public Alerts page are not affected.
      </p>
      {current === "radius" && (latitude == null || longitude == null) ? (
        <p className="text-[10px] font-bold text-yellow-800">
          Find the location on the map first. Without a pin, this goes to all tourists in Daet now.
        </p>
      ) : null}
      <p className="flex items-center gap-1 text-[10px] font-bold text-blue-700">
        <Users size={11} /> {countText}
      </p>
      {current !== "all" && severity === "Critical" ? (
        <p className="text-[10px] font-bold text-yellow-800">
          This is a Critical alert. Consider sending it to everyone so no tourist is missed.
        </p>
      ) : null}
    </div>
  );
}
