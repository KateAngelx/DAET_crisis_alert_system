import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { API_RATE_LIMITS, enforceRateLimitByKey } from "@/lib/apiRateLimit";

function escapeCsv(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const limited = enforceRateLimitByKey(auth.user.id, {
    name: "admin-export",
    ...API_RATE_LIMITS.adminExport,
  });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "users";

  if (type === "users") {
    const { data, error } = await auth.admin
      .from("profiles")
      .select("id, full_name, email, phone, user_type, nationality, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const headers = ["full_name", "email", "phone", "user_type", "nationality", "is_active", "created_at"];
    const csv = toCsv(headers, data || []);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="connect-daet-users.csv"',
      },
    });
  }

  if (type === "incidents") {
    const { data, error } = await auth.admin
      .from("incident_reports")
      .select("reference_number, category, severity, status, location, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const headers = ["reference_number", "category", "severity", "status", "location", "created_at", "updated_at"];
    const csv = toCsv(headers, data || []);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="connect-daet-incidents.csv"',
      },
    });
  }

  return NextResponse.json({ error: "Invalid export type. Use users or incidents." }, { status: 400 });
}
