"use client";

import React from "react";
import { X } from "lucide-react";
import { adminShell, iconSize } from "@/lib/designSystem";

/**
 * Modal with sticky header + close button; body scrolls independently.
 */
export function AdminModalShell({ open, onClose, title, subtitle, headerExtra, children, maxWidth = "max-w-2xl" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl border border-zinc-200 shadow-xl ${maxWidth} w-full max-h-[90vh] flex flex-col min-h-0`}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-100 bg-white rounded-t-2xl px-6 py-4 shrink-0">
          <div className="min-w-0">
            {subtitle ? (
              <p className="font-mono text-sm text-blue-600 font-black truncate">{subtitle}</p>
            ) : null}
            {title ? (
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 truncate">{title}</h2>
            ) : null}
            {headerExtra}
          </div>
          <button type="button" onClick={onClose} className={`${adminShell.btnIcon} shrink-0`} aria-label="Close">
            <X size={iconSize.button} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 py-5 space-y-5 min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
