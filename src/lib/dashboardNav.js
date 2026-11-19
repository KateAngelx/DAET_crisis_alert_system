import { FEATURE_NAMES as N } from "@/lib/featureNames";

/** Admin sidebar: command → tourists → guides → accounts (placement only; routes unchanged). */
export const ADMIN_NAV = {
  command: [
    { id: "dashboard", path: "/admin", label: "Dashboard" },
    { id: "alerts", path: "/crisis/command", label: N.alerts, countKey: "commandCenter", countDescription: "unread crisis and emergency notifications" },
    { id: "roads", path: "/crisis/roads", label: N.roads, countKey: "roadsHazards", countDescription: "unread road and hazard notifications" },
  ],
  tourists: [
    { id: "reports", path: "/admin/incidents", label: "Incident reports", countKey: "incidentReports", countDescription: "unread incident notifications" },
    { id: "help", path: "/admin/guide-assistance", label: N.helpRequests, countKey: "guideAssistance", countDescription: "unread help-request notifications" },
    { id: "missing", path: "/admin/missing-persons", label: "Missing persons" },
  ],
  guides: [
    { id: "guideEmergencies", path: "/admin/guide-emergencies", label: "Guide emergencies" },
    { id: "guideMonitoring", path: "/admin/guides", label: "Guide monitoring" },
  ],
  accounts: [
    { id: "people", path: "/admin/users", label: "People" },
    { id: "history", path: "/admin/archive", label: "History", countKey: "crisisFeedback", countDescription: "unread feedback notifications" },
    { id: "settings", path: "/admin/settings", label: "Settings" },
  ],
};

export const ADMIN_NAV_SECTIONS = [
  ["Command center", ADMIN_NAV.command],
  ["Tourists", ADMIN_NAV.tourists],
  ["Guides", ADMIN_NAV.guides],
  ["Accounts & records", ADMIN_NAV.accounts],
];

/** Guides: four main items + More. Tourists & invites and Roads & Hazards are tabs inside Groups and Alerts. */
export const GUIDE_NAV = {
  main: [
    { id: "dashboard", path: "/guide", label: "Today", short: "Today" },
    { id: "groups", path: "/guide/groups", label: "Groups", short: "Groups" },
    { id: "help", path: "/guide/assistance", label: N.helpRequests, short: "Help" },
    { id: "alerts", path: "/guide/crisis", label: N.alerts, short: "Alerts" },
  ],
  more: [
    { id: "history", path: "/guide/history", label: "Past tours" },
    { id: "reports", path: "/guide/reports", label: N.reports },
    { id: "howto", path: "/guide/how-to-use", label: "How to Use" },
    { id: "profile", path: "/guide/profile", label: "My profile" },
  ],
};

export function isNavActive(pathname, path) {
  if (path === "/admin" || path === "/guide" || path === "/crisis") {
    return pathname === path;
  }
  if (path === "/guide/groups") {
    return pathname === "/guide/groups" || pathname.startsWith("/guide/groups/") || pathname === "/guide/tourists";
  }
  if (path === "/guide/crisis") {
    return pathname === "/guide/crisis" || pathname === "/guide/routes" || pathname.startsWith("/guide/routes/");
  }
  if (path === "/guide/history") {
    return pathname === "/guide/history";
  }
  if (path === "/admin/archive") {
    return ["/admin/archive", "/admin/activity", "/admin/crisis-feedback"].includes(pathname);
  }
  if (path === "/admin/settings") {
    return pathname === "/admin/settings" || pathname === "/admin/how-to-use";
  }
  if (path === "/admin/users") {
    return pathname === "/admin/users";
  }
  if (path === "/admin/guides") {
    return pathname === "/admin/guides";
  }
  if (path.startsWith("/guide/")) {
    return pathname === path || pathname.startsWith(`${path}/`);
  }
  if (path === "/crisis/command") {
    return pathname === "/crisis/command";
  }
  if (path === "/crisis/roads") {
    return pathname === "/crisis/roads" || pathname.startsWith("/crisis/roads/") || pathname.startsWith("/crisis/hazards");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}