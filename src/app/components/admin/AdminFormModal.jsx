"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Shared frame for admin create/edit forms (Roads, Area Hazards), so every form modal
 * is the same width and height, with the header and action bar pinned and the body scrolling.
 */
export function AdminFormModal({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-[2001] flex h-[min(90vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:bg-zinc-900"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-black uppercase text-zinc-900 dark:text-white">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full p-2 hover:bg-zinc-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 gap-3 border-t border-zinc-100 bg-white px-6 py-3 dark:bg-zinc-900">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
