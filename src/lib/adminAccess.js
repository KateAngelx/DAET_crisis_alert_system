export function adminAccessDecision(profile) {
  if (profile?.user_type !== "admin") return "Admin access required";
  if (profile.is_active !== true) return "Active administrator access required";
  return null;
}
