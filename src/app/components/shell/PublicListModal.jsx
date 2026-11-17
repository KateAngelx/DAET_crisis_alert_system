"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { portalShell, typography } from "@/lib/designSystem";

/** size "lg" matches the Route Advisory details window (same width, height and backdrop). */
const SIZES = {
  md: {
    overlay: "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4",
    backdrop: "absolute inset-0 bg-zinc-900/50",
    panel: "max-w-lg max-h-[min(85vh,720px)]",
  },
  lg: {
    overlay: "fixed inset-0 z-[2000] flex items-center justify-center p-4",
    backdrop: "absolute inset-0 bg-black/80 backdrop-blur-sm",
    panel: "max-w-2xl h-[90vh] max-h-[90vh]",
  },
};

export function PublicListModal({ open, onClose, title, subtitle, children, footer, onContentViewed, viewKey, size = "md" }) {
  const frame = SIZES[size] || SIZES.md;
  const detailBodyRef = React.useRef(null);
  const reportedViewRef = React.useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    reportedViewRef.current = null;
    if (!open || !onContentViewed || !viewKey) return undefined;

    const frame = requestAnimationFrame(() => {
      const body = detailBodyRef.current;
      if (body && body.scrollHeight <= body.clientHeight + 4) {
        reportedViewRef.current = viewKey;
        onContentViewed(viewKey);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, onContentViewed, viewKey]);

  if (!open) return null;

  return (
    <div className={frame.overlay}>
      <button type="button" className={frame.backdrop} aria-label="Close dialog" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-list-modal-title"
        className={`relative z-[1] w-full ${frame.panel} flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl`}
      >
        {size === "lg" ? (
          /* Same header as the Route Advisory details window. */
          <div className="shrink-0 bg-white rounded-t-2xl border-b border-zinc-100 px-6 py-4 flex items-start justify-between gap-4">
            <p id="public-list-modal-title" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              {title}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors shrink-0"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
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
        )}
        {footer && size !== "lg" ? <div className="shrink-0 border-b border-zinc-100 bg-white p-4 empty:hidden">{footer}</div> : null}
        <div
          ref={detailBodyRef}
          className={`${portalShell.panelBody} overflow-y-auto overscroll-contain flex-1 min-h-0`}
          onScroll={(event) => {
            const body = event.currentTarget;
            if (
              onContentViewed &&
              viewKey &&
              body.scrollTop + body.clientHeight >= body.scrollHeight - 8 &&
              reportedViewRef.current !== viewKey
            ) {
              reportedViewRef.current = viewKey;
              onContentViewed(viewKey);
            }
          }}
        >
          {children}
        </div>
        {size === "lg" ? (
          /* Same pinned bottom bar as the Route Advisory details window: reward, then Close. */
          <div className="shrink-0 border-t border-zinc-100 bg-white p-4 rounded-b-2xl">
            {footer ? <div className="mb-3 empty:hidden">{footer}</div> : null}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
