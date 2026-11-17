/**
 * Route-aware nav active state. Alerts is active on /crisis and its Past alerts tab.
 */
export function isPublicNavActive(pathname, href) {
  if (href === "/") return pathname === "/";
  if (href === "/crisis") return pathname === "/crisis" || pathname === "/crisis/resolved";
  if (href === "/crisis/resolved") {
    return pathname === "/crisis/resolved" || pathname.startsWith("/crisis/resolved/");
  }
  if (href === "/routes") {
    return pathname === "/routes" || pathname.startsWith("/routes/");
  }
  if (href === "/crisis/reports") {
    return pathname === "/crisis/reports" || pathname.startsWith("/crisis/reports/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
