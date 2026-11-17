"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, History, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { buildAlertTimeline } from "@/lib/crisisAlertHistory";
import { getSeverityColor } from "@/lib/constants";

function formatWhen(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** All Clear box plus a newest-first list of every change to an alert. */
export function AlertUpdateTimeline({ alert }) {
  const alertId = alert?.id;
  const [state, setState] = useState({ alertId: null, items: [] });

  useEffect(() => {
    if (!alertId) return undefined;
    let cancelled = false;
    supabase
      .from("crisis_alert_updates")
      .select("id, kind, title, message, type, severity, location, status, all_clear_message, created_at")
      .eq("alert_id", alertId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        // Before migration 047 there is no history table; the section stays hidden.
        setState({ alertId, items: error ? [] : buildAlertTimeline(data || []) });
      });
    return () => {
      cancelled = true;
    };
  }, [alertId]);

  const items = state.alertId === alertId ? state.items : [];
  const isResolved = String(alert?.status || "").toLowerCase() === "resolved";
  const allClear = String(alert?.all_clear_message || items.find((i) => i.kind === "resolved")?.allClear || "").trim();

  return (
    <>
      {isResolved ? (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4" role="status">
          <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={20} />
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-green-700">All Clear</p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-green-900">
              {allClear || "The Tourism Office has marked this alert as resolved. It is no longer an active emergency."}
            </p>
          </div>
        </div>
      ) : null}

      {items.length > 1 ? (
        <section className="space-y-2" aria-label="Alert updates">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500">
            <History size={12} /> Updates ({items.length})
          </p>
          <ol className="relative space-y-3 border-l-2 border-zinc-200 pl-4">
            {items.map((item) => (
              <li key={item.id} className="relative">
                <span
                  className={`absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full border-2 border-white ${
                    item.kind === "resolved" ? "bg-green-500" : item.kind === "reopened" ? "bg-blue-600" : "bg-zinc-400"
                  }`}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-black ${item.kind === "resolved" ? "text-green-700" : "text-zinc-800"}`}>
                    {item.kind === "reopened" ? <RotateCcw size={11} className="mr-1 inline" /> : null}
                    {item.label}
                  </span>
                  {item.severity && item.kind !== "resolved" ? (
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${getSeverityColor(item.severity)}`}>
                      {item.severity}
                    </span>
                  ) : null}
                  <span className="text-[10px] font-bold text-zinc-400">{formatWhen(item.at)}</span>
                </div>
                {item.changes.length ? (
                  <ul className="mt-1 space-y-0.5 text-xs text-zinc-600">
                    {item.changes.map((change) => <li key={change}>{change}</li>)}
                  </ul>
                ) : null}
                {item.allClear ? <p className="mt-1 text-xs text-green-800">{item.allClear}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
