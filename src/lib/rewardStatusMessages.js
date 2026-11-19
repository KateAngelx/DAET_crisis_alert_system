/** User-facing copy for reward RPC result.status values (alerts vs travel advisories). */

const TRAVEL_MESSAGES = {
  rewards_disabled: "The Rewards Program is currently turned off.",
  activity_disabled: "Points for viewing this information are currently turned off.",
  advisory_not_found: "This item is not active, not public, or is outside its advisory dates.",
  not_tourist: "Only tourist accounts earn viewing points.",
  invalid_activity: "This viewing action is not recognized.",
  already_awarded: "already_awarded",
  awarded: "awarded",
};

const ALERT_MESSAGES = {
  rewards_disabled: "The Rewards Program is currently turned off.",
  activity_disabled: "Alert reading points are currently turned off.",
  not_eligible: "This advisory is not eligible for points.",
  alert_not_found: "This advisory could not be found.",
  not_tourist: "Only tourist accounts earn reading points.",
  already_awarded: "already_awarded",
  awarded: "awarded",
};

export function travelRewardStatusMessage(status) {
  if (!status || status === "awarded" || status === "already_awarded") return null;
  return TRAVEL_MESSAGES[status] || "Could not confirm this item for reward points.";
}

export function alertRewardStatusMessage(status) {
  if (!status || status === "awarded" || status === "already_awarded") return null;
  return ALERT_MESSAGES[status] || null;
}