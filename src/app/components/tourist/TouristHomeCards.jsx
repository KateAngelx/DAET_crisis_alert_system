"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Compass, Phone, ShieldCheck } from "lucide-react";
import { useGuideStore } from "@/app/store/guideStore";
import { TouristTourMenu } from "@/app/components/tourist/TouristTourMenu";
import { formatTourRoute } from "@/lib/tourGroupRoute";
import { alertsForTourist } from "@/lib/alertsForTourist";
import { typography } from "@/lib/designSystem";

const SEVERITY_CHIP = {
  Critical: "bg-red-600 text-white",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-amber-100 text-amber-800",
  Low: "bg-zinc-100 text-zinc-700",
};

/** Tourist home: "My tour today" first, then only the alerts that matter to this tourist. */
export function TouristHomeCards({ alerts = [], loading = false }) {
  const { touristActiveGroup, pendingAssignment } = useGuideStore();
  const group = touristActiveGroup?.tour_group || null;
  const guide = touristActiveGroup?.guide || null;
  const mine = alertsForTourist(alerts, group);

  return (
    <section className="border-b border-zinc-100 bg-white py-6 md:py-10">
      <div className="mx-auto grid max-w-7xl gap-6 px-3 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className={typography.pageTitle}>My tour today</h2>
          <TouristTourMenu>
            {({ visible, openTour }) => (
              <div className="mt-3 rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
                {pendingAssignment ? (
                  <>
                    <p className="text-sm font-black text-zinc-900">
                      {pendingAssignment.guide?.full_name || "A guide"} invited you to a tour
                    </p>
                    <p className="mt-1 text-xs font-medium text-zinc-600">{formatTourRoute(pendingAssignment.tour_group)}</p>
                    <button type="button" onClick={openTour} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-800">
                      See the invite <ChevronRight size={14} />
                    </button>
                  </>
                ) : group ? (
                  <>
                    <p className="text-sm font-black text-zinc-900">{group.name}</p>
                    <p className="mt-1 text-sm font-bold text-blue-700">{formatTourRoute(group)}</p>
                    <p className="mt-1 text-xs font-medium text-zinc-600">Guide: {guide?.full_name || "To be assigned"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {guide?.phone ? (
                        <a href={`tel:${guide.phone}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-800">
                          <Phone size={14} /> Call my guide
                        </a>
                      ) : null}
                      <button type="button" onClick={openTour} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-purple-300 bg-white px-4 text-xs font-black uppercase tracking-widest text-purple-800 hover:bg-purple-50">
                        <Compass size={14} /> Open my tour
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-black text-zinc-900">No tour today</p>
                    <p className="mt-1 text-xs font-medium text-zinc-600">
                      When a guide invites you, the invite shows here.
                      {visible ? " You can also ask the Tourism Office for a local guide. This is not an emergency service." : ""}
                    </p>
                    {visible ? (
                      <button type="button" onClick={openTour} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-800">
                        <Compass size={14} /> Ask a guide for help
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </TouristTourMenu>
        </div>

        <div>
          <h2 className={typography.pageTitle}>Alerts for you</h2>
          {loading ? (
            <p className="mt-3 text-sm font-medium text-zinc-500">Checking alerts...</p>
          ) : mine.length ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {mine.slice(0, 4).map(({ alert, reason }) => (
                <Link
                  key={alert.id}
                  href={`/crisis?alert=${alert.id}`}
                  className="flex items-center gap-3 border-b border-zinc-100 px-3 py-3 last:border-b-0 hover:bg-zinc-50 sm:px-4"
                >
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${SEVERITY_CHIP[alert.severity] || SEVERITY_CHIP.Low}`}>
                    {alert.severity || "Alert"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-zinc-900">{alert.title}</span>
                    <span className="block truncate text-xs font-medium text-zinc-500">
                      {reason}{alert.location ? ` · ${alert.location}` : ""}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-zinc-400" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <ShieldCheck className="shrink-0 text-green-700" size={18} />
              <p className="text-sm font-bold text-zinc-800">Nothing serious or near your tour right now.</p>
            </div>
          )}
          <Link href="/crisis" className="mt-3 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-blue-600 hover:underline">
            See all alerts <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
