"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { fetchWithFreshSession } from "@/lib/authSession";
import { buildAdminNeeds } from "@/lib/adminNeeds";

const MAX_DELIVERY_CHECKS = 5;

async function getJson(url) {
  try {
    const response = await fetchWithFreshSession(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Admin dashboard, first panel: what needs action now, most urgent first.
 * Reports come from the page; missing tourists, waiting help requests and failed texts load here.
 */
export function AdminNeedsAction({ incidents = [], activeAlerts = [], ready = true }) {
  const [extra, setExtra] = useState({ loading: true, missingCases: [], pendingHelp: 0, smsFailures: [] });
  const alertKey = activeAlerts.slice(0, MAX_DELIVERY_CHECKS).map((a) => a.id).join(",");

  useEffect(() => {
    let cancelled = false;
    const alertIds = alertKey ? alertKey.split(",") : [];
    Promise.all([
      getJson("/api/missing-persons"),
      getJson("/api/admin/guide-assistance?status=Pending&page=1"),
      Promise.all(alertIds.map((id) => getJson(`/api/crisis/alerts/${id}/delivery`).then((report) => ({ id, report })))),
    ]).then(([missing, help, deliveries]) => {
      if (cancelled) return;
      setExtra({
        loading: false,
        missingCases: missing?.cases || [],
        pendingHelp: help?.totalCount || 0,
        smsFailures: deliveries.map(({ id, report }) => ({ alertId: id, failed: report?.summary?.smsFailed || 0 })),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [alertKey]);

  const items = buildAdminNeeds({
    incidents,
    missingCases: extra.missingCases,
    pendingHelp: extra.pendingHelp,
    smsFailures: extra.smsFailures.map((row) => ({ ...row, title: activeAlerts.find((a) => a.id === row.alertId)?.title })),
  });

  if (!ready || (extra.loading && !items.length)) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-500">
        <Loader2 size={16} className="animate-spin" /> Checking what needs action...
      </p>
    );
  }

  if (!items.length) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-900">
        <ShieldCheck size={18} className="shrink-0 text-green-600" /> Nothing needs action right now.
      </p>
    );
  }

  return (
    <section aria-labelledby="admin-needs-action" className="overflow-hidden rounded-2xl border border-amber-200 bg-white">
      <h2 id="admin-needs-action" className="bg-amber-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-800 sm:px-5">
        Needs action <span className="ml-1 text-amber-600">({items.length})</span>
      </h2>
      <ul className="divide-y divide-zinc-100">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-amber-50/50 sm:px-5 ${item.urgent ? "border-l-4 border-red-500" : ""}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-zinc-900">{item.title}</span>
                <span className="mt-0.5 block text-xs font-medium text-zinc-500">{item.description}</span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-[10px] font-black uppercase tracking-widest text-amber-700">Open</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
