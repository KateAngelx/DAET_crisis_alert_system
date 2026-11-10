export const ADMIN_NAV = {
  coreAdmin: [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/activity", label: "Activity Log" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/guides", label: "Guide Monitoring" },
    { path: "/admin/settings", label: "Settings" },
  ],
  crisisOps: [
    { path: "/crisis/command", label: "Command Center", countKey: "commandCenter", countDescription: "unread crisis and emergency notifications" },
    { path: "/crisis/roads", label: "Roads & Hazards", countKey: "roadsHazards", countDescription: "unread road and hazard notifications" },
    { path: "/admin/incidents", label: "Incident Reports", countKey: "incidentReports", countDescription: "unread incident notifications" },
    { path: "/admin/guide-assistance", label: "Tourist Guide Assistance", countKey: "guideAssistance", countDescription: "unread guide-assistance notifications" },
    { path: "/admin/crisis-feedback", label: "Crisis Feedback", countKey: "crisisFeedback", countDescription: "unread crisis-feedback notifications" },
    { path: "/admin/archive", label: "Archive & History" },
  ],
};

export const GUIDE_NAV = {
  work: [
    { path: "/guide", label: "Dashboard" },
    { path: "/guide/groups", label: "Tour groups" },
    { path: "/guide/tourists", label: "Tourists & invitations" },
    { path: "/guide/assistance", label: "Assistance requests" },
  ],
  records: [
    { path: "/guide/completed", label: "Completed tours" },
    { path: "/guide/history", label: "History" },
    { path: "/guide/reports", label: "My reports" },
  ],
  alerts: [
    { path: "/guide/crisis", label: "Crisis alerts" },
    { path: "/guide/routes", label: "Road & travel advisories" },
  ],
};

export function isNavActive(pathname, path) {
  if (path === "/admin" || path === "/guide" || path === "/crisis") {
    return pathname === path;
  }
  if (path === "/guide/groups") {
    return pathname === "/guide/groups" || pathname.startsWith("/guide/groups/");
  }
  if (path === "/guide/completed") {
    return pathname === "/guide/completed";
  }
  if (path === "/guide/history") {
    return pathname === "/guide/history";
  }
  if (path === "/admin/archive") {
    return pathname === "/admin/archive";
  }
  if (path.startsWith("/guide/")) {
    return pathname === path || pathname.startsWith(`${path}/`);
  }
  if (path === "/crisis/command") {
    return pathname === "/crisis/command";
  }
  if (path === "/crisis/roads") {
    return pathname === "/crisis/roads" || pathname.startsWith("/crisis/roads/");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
