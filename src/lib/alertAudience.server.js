import { normalizeTargetScope, touristMatchesAlertTarget } from "@/lib/alertTargeting";

/** Extra profile columns targeting needs (added by migration 048). */
export const TARGETING_PROFILE_COLUMNS = ", visit_start_date, visit_end_date, last_seen_at";

const CHUNK = 200;

function isMissingTable(error) {
  return ["42P01", "PGRST205", "PGRST200"].includes(error?.code);
}

/** Each tourist's tour groups (via active guide assignments). */
async function loadTourGroupsByTourist(admin, touristIds) {
  const byTourist = new Map();
  for (let i = 0; i < touristIds.length; i += CHUNK) {
    const { data, error } = await admin
      .from("guide_assignments")
      .select("tourist_id, tour_group:tour_groups(status, start_date, end_date, destination, starting_location, meeting_location)")
      .in("tourist_id", touristIds.slice(i, i + CHUNK))
      .eq("status", "active");
    if (error) return { byTourist, error };
    for (const row of data || []) {
      if (!row.tour_group) continue;
      const list = byTourist.get(row.tourist_id) || [];
      list.push(row.tour_group);
      byTourist.set(row.tourist_id, list);
    }
  }
  return { byTourist, error: null };
}

/** Shared positions (only tourists who turned sharing on have a row). Missing table = none. */
async function loadLocationsByTourist(admin, touristIds) {
  const byTourist = new Map();
  for (let i = 0; i < touristIds.length; i += CHUNK) {
    const { data, error } = await admin
      .from("tourist_locations")
      .select("user_id, latitude, longitude, recorded_at")
      .in("user_id", touristIds.slice(i, i + CHUNK));
    if (error) {
      if (isMissingTable(error)) return { byTourist, error: null }; // migration 049 not applied
      return { byTourist, error };
    }
    for (const row of data || []) byTourist.set(row.user_id, row);
  }
  return { byTourist, error: null };
}

/**
 * Keep only the tourists an alert targets; guides and admins always stay.
 * If targeting data cannot be loaded, everyone is kept (never drop people from a crisis alert).
 * @returns {Promise<{ profiles: object[], outsideTarget: number, error: string|null }>}
 */
export async function narrowRecipientsForAlert(admin, profiles, alert, nowMs = Date.now()) {
  const scope = normalizeTargetScope(alert?.target_scope);
  if (scope === "all") return { profiles, outsideTarget: 0, error: null };

  const touristIds = profiles.filter((p) => p.user_type === "tourist").map((p) => p.id);
  const [groups, locations] = await Promise.all([
    loadTourGroupsByTourist(admin, touristIds),
    scope === "area" ? Promise.resolve({ byTourist: new Map(), error: null }) : loadLocationsByTourist(admin, touristIds),
  ]);
  const failure = groups.error || locations.error;
  if (failure) {
    return {
      profiles,
      outsideTarget: 0,
      error: `Could not apply alert targeting (${failure.message}); sent to all tourists instead.`,
    };
  }

  const kept = profiles.filter((profile) =>
    profile.user_type !== "tourist"
    || touristMatchesAlertTarget({
      scope,
      profile: { ...profile, location: locations.byTourist.get(profile.id) || null },
      groups: groups.byTourist.get(profile.id) || [],
      alert,
      nowMs,
    })
  );
  return { profiles: kept, outsideTarget: profiles.length - kept.length, error: null };
}
