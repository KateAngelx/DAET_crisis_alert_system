"use client";

import React from "react";
import { Search } from "lucide-react";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { adminShell, iconSize } from "@/lib/designSystem";

/**
 * Command Center–style filter panel (search left, controls right).
 */
export function AdminFilterBar({
  title = "Live command filters",
  subtitle,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  children,
  chips,
  compact = false,
}) {
  const row = (
    <div className="flex flex-row items-center gap-2 min-w-0">
      <div className="relative flex-1 min-w-0">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
          size={compact ? iconSize.inline : iconSize.section}
        />
        <input
          className={`${adminShell.input} ${compact ? "!py-2 !text-xs pl-8" : "pl-10"}`}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={onSearchChange}
        />
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );

  if (compact) {
    return (
      <AdminPanel title={title} compact bodyClassName="!pt-2 !pb-2.5">
        {chips ? <div className="flex flex-wrap gap-1.5 mb-2">{chips}</div> : null}
        {row}
      </AdminPanel>
    );
  }

  return (
    <AdminPanel title={title} subtitle={subtitle}>
      {chips ? <div className="flex flex-wrap gap-2 mb-4">{chips}</div> : null}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            size={iconSize.section}
          />
          <input
            className={`${adminShell.input} pl-10`}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
          />
        </div>
        {children}
      </div>
    </AdminPanel>
  );
}
