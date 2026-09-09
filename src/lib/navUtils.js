/**
 * Route-aware nav active state. Crisis Hub is active only on /crisis exactly.
 */
export function isPublicNavActive(pathname, href) {
  if (href === "/") return pathname === "/";
  if (href === "/crisis") return pathname === "/crisis";
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
