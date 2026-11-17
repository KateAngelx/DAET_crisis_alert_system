"use client";

import React, { useId, useState } from "react";
import { CircleHelp } from "lucide-react";

/** A small "?" next to a hard word. Tap or focus it to read one or two plain sentences. */
export function HelpTip({ label, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onBlur={() => setOpen(false)}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <CircleHelp size={14} />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-1 w-64 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-3 text-left text-xs font-medium normal-case leading-relaxed tracking-normal text-zinc-700 shadow-xl"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
