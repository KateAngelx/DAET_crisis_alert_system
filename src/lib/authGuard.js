import { ROLES } from '@/lib/constants';

export function canAccessAdmin(role) {
  return role === ROLES.ADMIN;
}

export function canAccessGuide(role) {
  return role === ROLES.GUIDE;
}

export function isAuthenticated(user) {
  return !!user;
}

export function getRedirectForRole(role) {
  switch (role) {
    case ROLES.ADMIN:
      return '/admin';
    case ROLES.GUIDE:
      return '/guide';
    default:
      return '/';
  }
}

export function canViewIncident(user, incident, assignedTouristIds = []) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  if (incident.reporter_id === user.id) return true;
  if (user.role === ROLES.GUIDE) {
    return assignedTouristIds.includes(incident.reporter_id) || incident.assigned_to === user.id;
  }
  return false;
}
