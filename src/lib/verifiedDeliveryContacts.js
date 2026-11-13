/**
 * Addresses allowed for email and SMS.
 * profiles.email and profiles.phone are not used: profile email can be edited
 * through row security, and profile phone can be changed without verification.
 * Auth email and phone are used only after Supabase marks them confirmed.
 */
export function verifiedDeliveryContacts(authUser) {
  if (!authUser) return { email: null, phone: null };

  const email = String(authUser.email || "").trim();
  const phone = String(authUser.phone || "").trim();

  return {
    email: authUser.email_confirmed_at && email ? email : null,
    phone: authUser.phone_confirmed_at && phone ? phone : null,
  };
}
