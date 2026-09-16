"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { portalShell, typography } from "@/lib/designSystem";

export function PublicListModal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-zinc-900/50" aria-label="Close dialog" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-list-modal-title"
        className="relative w-full max-w-lg max-h-[min(85vh,720px)] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className={`${portalShell.panelHeader} shrink-0 flex flex-row items-start justify-between gap-3`}>
          <div className="min-w-0 text-left">
            <h2 id="public-list-modal-title" className={typography.sectionTitle}>
              {title}
            </h2>
            {subtitle ? <p className="text-xs text-zinc-400 font-medium mt-0.5">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`${portalShell.panelBody} overflow-y-auto overscroll-contain flex-1 min-h-0`}>{children}</div>
      </div>
    </div>
  );
}
