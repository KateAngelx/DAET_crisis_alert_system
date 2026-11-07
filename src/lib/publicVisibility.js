/** What visitors can see. Both stay on until an admin turns one off. */

export const DEFAULT_PUBLIC_VISIBILITY = {
  map: true,
  roadsAndHazards: true,
};

export function normalizePublicVisibility(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PUBLIC_VISIBILITY };
  }
  return {
    map: raw.map !== false,
    roadsAndHazards: raw.roadsAndHazards !== false,
  };
}
