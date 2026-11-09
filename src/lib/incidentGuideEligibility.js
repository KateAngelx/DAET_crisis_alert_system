/** Only stored incident category that qualifies for tourism-guide assignment. */
const GUIDE_INCIDENT_CATEGORIES = new Set(['tourist assistance']);

export function normalizeIncidentReportCategory(category) {
  if (category == null) return '';
  return String(category).trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * The incident_reports schema stores one category, not a separate type.
 * Only Tourist Assistance may represent a request or need for a tourism guide;
 * unknown categories and all other stored categories are not guide-assignable.
 */
export function incidentReportEligibleForGuideAssignment(incidentOrCategory) {
  const category =
    typeof incidentOrCategory === 'string'
      ? incidentOrCategory
      : incidentOrCategory?.category;

  const normalized = normalizeIncidentReportCategory(category);
  return GUIDE_INCIDENT_CATEGORIES.has(normalized);
}
