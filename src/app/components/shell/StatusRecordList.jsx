"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { portalShell } from "@/lib/designSystem";

export const STATUS_RECORD_ROW =
  "grid grid-cols-[4.75rem_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] items-center gap-x-2";

export function CategoryFilterSelect({ label, value, onChange, options, allValue = "all", allLabel = "All" }) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
        {label}
      </span>
      <select
        className={portalShell.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        <option value={allValue}>{allLabel}</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function ViewMark({ label = "View" }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wide text-blue-600 shrink-0">
      {label}
      <ArrowRight size={14} aria-hidden />
    </span>
  );
}

export function StatusRecordList({
  rows,
  emptyMessage = "Nothing is published in this category right now.",
}) {
  if (!rows.length) {
    return (
      <p className="text-sm font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-xl p-3">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
      <div className={`${STATUS_RECORD_ROW} px-3 py-2 bg-zinc-50 border-b border-zinc-100`}>
        {["Status", "Place", "Type", "When"].map((label) => (
          <span key={label} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 truncate">
            {label}
          </span>
        ))}
        <span className="sr-only">Details</span>
      </div>
      <ul className="divide-y divide-zinc-100">
        {rows.map((row) => {
          const cells = (
            <>
              <span className={`inline-flex max-w-full truncate text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded ${row.statusClass || "bg-zinc-100 text-zinc-600"}`}>
                {row.status || "—"}
              </span>
              <span className="truncate text-xs font-medium text-zinc-700" title={row.place}>{row.place || "—"}</span>
              <span className="truncate text-xs font-medium text-zinc-700" title={row.type}>{row.type || "—"}</span>
              <span className="truncate text-xs font-medium text-zinc-700" title={row.when}>{row.when || "—"}</span>
            </>
          );

          if (row.actions?.length) {
            return (
              <li key={row.id}>
                <div className={`${STATUS_RECORD_ROW} w-full text-left px-3 py-2.5 bg-white`}>
                  {cells}
                  <span className="inline-flex items-center justify-end gap-2 shrink-0">
                    {row.actions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={action.onClick}
                        className="text-[10px] font-black uppercase tracking-wide text-blue-600 hover:underline"
                      >
                        {action.label}
                      </button>
                    ))}
                  </span>
                </div>
              </li>
            );
          }

          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={row.onSelect}
                className={`${STATUS_RECORD_ROW} w-full text-left px-3 py-2.5 bg-white transition-colors hover:bg-zinc-50`}
                aria-label={row.ariaLabel || "View details"}
              >
                {cells}
                <ViewMark label={row.actionLabel} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
