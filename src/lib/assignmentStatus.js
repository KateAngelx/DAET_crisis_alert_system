export const ASSIGNMENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  DECLINED: 'declined',
  REMOVED: 'removed',
};

export const ASSIGNMENT_STATUS_LABELS = {
  pending: 'Assignment Pending',
  active: 'Assigned',
  declined: 'Declined',
  removed: 'Removed/Ended',
};

export function getTouristAvailabilityStatus(touristId, assignments, guideId, tourGroupId) {
  const active = assignments.find((a) => a.tourist_id === touristId && a.status === 'active');
  if (active) {
    if (active.guide_id === guideId && active.tour_group_id === tourGroupId) {
      return { status: 'assigned', label: 'Assigned', assignment: active };
    }
    return { status: 'under_other', label: 'Under another guide', assignment: active };
  }

  const pending = assignments.find(
    (a) =>
      a.tourist_id === touristId &&
      a.status === 'pending' &&
      a.guide_id === guideId &&
      a.tour_group_id === tourGroupId
  );
  if (pending) {
    return { status: 'pending', label: 'Request Sent', assignment: pending };
  }

  const declined = assignments.find(
    (a) =>
      a.tourist_id === touristId &&
      a.status === 'declined' &&
      a.guide_id === guideId &&
      a.tour_group_id === tourGroupId
  );
  if (declined) {
    return { status: 'declined', label: 'Declined', assignment: declined };
  }

  return { status: 'available', label: 'Available', assignment: null };
}
