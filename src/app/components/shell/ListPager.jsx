"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function ListPager({ page, pageCount, onPage, disabled = false }) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 border-t border-zinc-100 px-3 py-2">
      <button
        type="button"
        aria-label="Previous page"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-12 text-center text-xs font-black text-zinc-600">
        {page} / {pageCount}
      </span>
      <button
        type="button"
        aria-label="Next page"
        disabled={disabled || page >= pageCount}
        onClick={() => onPage(page + 1)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
