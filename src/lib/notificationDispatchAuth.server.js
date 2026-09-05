const GUIDE_TOURIST_TYPES = new Set([
  "guide_assignment_request",
  "guide_assignment_accepted",
  "guide_assignment_declined",
  "guide_assignment",
]);

const TOURIST_TO_ADMIN_TYPES = new Set(["incident_submitted"]);

const ADMIN_TO_USER_TYPES = new Set(["incident_status", "incident_assigned"]);

export async function assertDispatchAuthorized(admin, caller, payload) {
  const { userId, notificationType } = payload;
  if (!userId || !notificationType) {
    return { allowed: false, reason: "userId and notificationType are required" };
  }

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("user_type")
    .eq("id", caller.id)
    .single();

  const callerRole = callerProfile?.user_type;
  if (!callerRole) {
    return { allowed: false, reason: "Caller profile not found" };
  }

  if (callerRole === "admin") {
    return { allowed: true };
  }

  if (userId === caller.id) {
    return { allowed: true };
  }

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("user_type")
    .eq("id", userId)
    .single();

  if (!targetProfile) {
    return { allowed: false, reason: "Recipient not found" };
  }

  if (callerRole === "tourist") {
    if (TOURIST_TO_ADMIN_TYPES.has(notificationType) && targetProfile.user_type === "admin") {
      return { allowed: true };
    }
    if (GUIDE_TOURIST_TYPES.has(notificationType) && targetProfile.user_type === "guide") {
      return { allowed: true };
    }
    return { allowed: false, reason: "Tourists may only notify admins (incidents) or their guide (assignments)" };
  }

  if (callerRole === "guide") {
    if (GUIDE_TOURIST_TYPES.has(notificationType) && targetProfile.user_type === "tourist") {
      return { allowed: true };
    }
    return { allowed: false, reason: "Guides may only notify tourists for assignment workflows" };
  }

  if (ADMIN_TO_USER_TYPES.has(notificationType)) {
    return { allowed: false, reason: "Only admins may send incident status notifications" };
  }

  return { allowed: false, reason: "Not authorized to notify this user" };
}
