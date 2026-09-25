import React from "react";

/** Shared pulse placeholder — use via Skeletons.js presets on pages. */
export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-200/90 dark:bg-zinc-800/90 ${className}`}
      aria-hidden
    />
  );
}