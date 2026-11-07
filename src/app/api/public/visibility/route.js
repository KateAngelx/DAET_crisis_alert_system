import { NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/systemSettings.server";
import { normalizePublicVisibility } from "@/lib/publicVisibility";

export async function GET() {
  const settings = await getSystemSettings();
  return NextResponse.json({
    success: true,
    visibility: normalizePublicVisibility(settings.public_visibility),
  });
}
