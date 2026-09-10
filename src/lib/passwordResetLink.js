import { getSiteUrl } from "@/lib/siteUrl";

/** Build a CONNECT-DAET reset URL that bypasses Supabase redirect URL restrictions */
export function buildAppPasswordResetLink({ siteUrl, hashedToken }) {
  if (!siteUrl || !hashedToken) return null;
  const url = new URL("/reset-password", siteUrl);
  url.searchParams.set("token_hash", hashedToken);
  return url.toString();
}

export function parseActionLinkRedirect(actionLink) {
  if (!actionLink) return null;
  try {
    return new URL(actionLink).searchParams.get("redirect_to");
  } catch {
    return null;
  }
}

export function resolvePasswordResetLink({ siteUrl, linkData, request }) {
  const baseUrl = siteUrl || getSiteUrl(request);
  const hashedToken = linkData?.properties?.hashed_token;
  const actionLink = linkData?.properties?.action_link || null;
  const appLink = buildAppPasswordResetLink({ siteUrl: baseUrl, hashedToken });

  return {
    resetLink: appLink || actionLink,
    appLink,
    actionLink,
    actionLinkRedirectTo: parseActionLinkRedirect(actionLink),
    usedAppLink: Boolean(appLink),
  };
}
