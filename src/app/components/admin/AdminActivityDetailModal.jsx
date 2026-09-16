"use client";

import Link from "next/link";
import { MapPin, User, ArrowRight } from "lucide-react";
import { AdminModalShell } from "@/app/components/admin/AdminModalShell";
import { adminShell, iconSize } from "@/lib/designSystem";
import { incidentStatusBadgeClass, normalizeIncidentStatusLabel } from "@/lib/incidentStatusUtils";
import { getSeverityColor } from "@/lib/constants";

function DetailRow({ label, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-1 sm:gap-4 py-2 border-b border-zinc-50 last:border-0">
      <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</dt>
      <dd className="text-sm font-medium text-zinc-800 min-w-0">{children}</dd>
    </div>
  );
}

export function AdminActivityDetailModal({ entry, onClose }) {
  if (!entry) return null;

  const isIncident = entry.source === "incident";
  const h = entry.raw;
  const inc = h?.incident_reports;

  return (
    <AdminModalShell
      open={Boolean(entry)}
      onClose={onClose}
      subtitle={new Date(entry.at).toLocaleString()}
      title={entry.actionLabel}
      headerExtra={
        <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-widest text-zinc-400">
          {isIncident ? "Incident report" : "Crisis alert"}
        </span>
      }
      maxWidth="max-w-3xl"
    >
      <dl className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-2">
        <DetailRow label="Actor">{entry.actor}</DetailRow>
        <DetailRow label="Summary">{entry.title}</DetailRow>
        <DetailRow label="Context">{entry.summary}</DetailRow>
        {entry.oldStatus || entry.status ? (
          <DetailRow label="Status change">
            {entry.oldStatus ? (
              <span className="text-zinc-500">{normalizeIncidentStatusLabel(entry.oldStatus)}</span>
            ) : (
              "—"
            )}
            {entry.oldStatus && entry.status ? (
              <span className="mx-2 text-zinc-300">→</span>
            ) : null}
            {entry.status ? (
              <span
                className={`text-[9px] font-black uppercase px-2 py-1 rounded-full inline align-middle ${incidentStatusBadgeClass(entry.status)}`}
              >
                {normalizeIncidentStatusLabel(entry.status)}
              </span>
            ) : null}
          </DetailRow>
        ) : null}
        {entry.notes ? (
          <DetailRow label="Notes">
            <p className="whitespace-pre-wrap text-zinc-600">{entry.notes}</p>
          </DetailRow>
        ) : null}
      </dl>

      {isIncident && inc ? (
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Report detail</h3>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
            <p className="font-black uppercase text-zinc-900">{inc.category}</p>
            <p className="text-sm text-zinc-600">{inc.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <MapPin size={iconSize.inlineSm} className="text-blue-500" />
                {inc.location || "—"}
              </span>
              {inc.reporter?.full_name ? (
                <span className="flex items-center gap-1">
                  <User size={iconSize.inlineSm} />
                  {inc.reporter.full_name}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getSeverityColor(inc.severity)}`}>
                {inc.severity}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${incidentStatusBadgeClass(inc.status)}`}
              >
                {normalizeIncidentStatusLabel(inc.status)}
              </span>
            </div>
          </div>
          <Link href="/admin/incidents" className={`${adminShell.btnGhost} no-underline inline-flex`}>
            Open incident reports <ArrowRight size={iconSize.inline} />
          </Link>
        </div>
      ) : null}

      {!isIncident && h ? (
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Alert detail</h3>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
            <p className="font-black text-zinc-900">{h.title}</p>
            <p className="text-sm text-zinc-600 whitespace-pre-wrap">{h.message}</p>
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <MapPin size={iconSize.inlineSm} className="text-blue-500" />
              {h.location || "—"}
            </p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getSeverityColor(h.severity)}`}>
              {h.severity}
            </span>
          </div>
          <Link href="/crisis/admin" className={`${adminShell.btnGhost} no-underline inline-flex`}>
            Open command center <ArrowRight size={iconSize.inline} />
          </Link>
        </div>
      ) : null}
    </AdminModalShell>
  );
}
