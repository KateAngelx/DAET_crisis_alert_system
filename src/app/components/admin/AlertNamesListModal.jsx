"use client";

import React from "react";
import { X } from "lucide-react";
import { adminShell, iconSize } from "@/lib/designSystem";

/** Name list above the Command Center alert modal (z-[2100]). */
export function AlertNamesListModal({ open, onClose, title, subtitle, children }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            {subtitle ? (
              <p className="truncate text-[10px] font-black uppercase tracking-widest text-zinc-500">{subtitle}</p>
            ) : null}
            <h2 className="truncate text-lg font-black uppercase tracking-tight text-zinc-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className={adminShell.btnIcon} aria-label="Close">
            <X size={iconSize.button} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}