import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/siteUrl";

/**
 * Supabase redirects here after email verification with ?code=...
 * Forward the code to the client reset page for exchangeCodeForSession.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/reset-password";
  const siteUrl = getSiteUrl(request);

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/forgot-password?error=missing_code`);
  }

  const destination = new URL(next, siteUrl);
  destination.searchParams.set("code", code);
  return NextResponse.redirect(destination.toString());
}
