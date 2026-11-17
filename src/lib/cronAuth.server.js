import { NextResponse } from "next/server";
import { checkCronSecret } from "@/lib/cronAuth";

export { checkCronSecret, readCronToken, secretsMatch } from "@/lib/cronAuth";

/** Route helper: `{ ok: true }` or `{ ok: false, response }` ready to return. */
export function requireCronSecret(request) {
  const check = checkCronSecret(request);
  if (check.ok) return { ok: true };
  return { ok: false, response: NextResponse.json({ error: check.error }, { status: check.status }) };
}
