/**
 * Route-aware nav active state. Crisis Hub is active only on /crisis exactly.
 */
export function isPublicNavActive(pathname, href) {
  if (href === "/") return pathname === "/";
  if (href === "/crisis") return pathname === "/crisis";
  if (href === "/crisis/alerts") {
    return pathname === "/crisis/alerts" || pathname.startsWith("/crisis/alerts/");
  }
  if (href === "/crisis/reports") {
    return pathname === "/crisis/reports" || pathname.startsWith("/crisis/reports/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
