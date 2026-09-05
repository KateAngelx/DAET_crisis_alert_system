export const ADMIN_NAV = {
  coreAdmin: [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/guides", label: "Guide Monitoring" },
    { path: "/admin/workflow", label: "Alert Pipeline" },
  ],
  crisisOps: [
    { path: "/crisis/admin", label: "Command Center" },
    { path: "/admin/incidents", label: "Incident Reports" },
  ],
};

export const GUIDE_NAV = {
  operations: [
    { path: "/guide", label: "Dashboard" },
    { path: "/guide/groups", label: "Tour Groups" },
    { path: "/guide/tourists", label: "Active Tourists" },
    { path: "/guide/notifications", label: "Notifications" },
  ],
  crisisInfo: [
    { path: "/guide/crisis", label: "Crisis Hub" },
    { path: "/guide/alerts", label: "Safety Advisories" },
    { path: "/guide/reports", label: "Group Reports" },
  ],
};

export function isNavActive(pathname, path) {
  if (path === "/admin" || path === "/guide" || path === "/crisis") {
    return pathname === path;
  }
  if (path === "/guide/groups") {
    return pathname === "/guide/groups" || pathname.startsWith("/guide/groups/");
  }
  if (path.startsWith("/guide/")) {
    return pathname === path || pathname.startsWith(`${path}/`);
  }
  if (path === "/crisis/admin") {
    return pathname === "/crisis/admin" || pathname.startsWith("/crisis/admin/");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
