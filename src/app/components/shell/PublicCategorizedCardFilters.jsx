"use client";

import React, { useMemo } from "react";
import { publicLayout } from "@/app/components/InfoPageHero";
export const DEFAULT_SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"];
export const DEFAULT_CRISIS_TYPE_OPTIONS = ["General", "Health", "Security", "Weather"];

export function FilterPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
        active ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

export function PublicCategorizedCardFilters({
  items = [],
  getCategory,
  getSeverity,
  categoryFilter,
  severityFilter,
  onCategoryFilterChange,
  onSeverityFilterChange,
  categoryLabel = "Crisis type",
  severityLabel = "Severity",
  categoryOptions = null,
  severityOptions = null,
  severityOrder = DEFAULT_SEVERITY_ORDER,
  className = "",
}) {
  const safeItems = items ?? [];

  const availableCategories = useMemo(() => {
    const set = new Set(safeItems.map((item) => getCategory(item)).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [safeItems, getCategory]);

  const availableSeverities = useMemo(() => {
    if (severityOptions?.length) {
      return severityOrder.filter((s) => severityOptions.includes(s));
    }
    const set = new Set(safeItems.map((item) => getSeverity(item)).filter(Boolean));
    return severityOrder.filter((s) => set.has(s));
  }, [safeItems, getSeverity, severityOrder, severityOptions]);

  const categoryChoices = useMemo(() => {
    if (categoryOptions?.length) {
      return [...categoryOptions].sort((a, b) => a.localeCompare(b));
    }
    return availableCategories;
  }, [categoryOptions, availableCategories]);

  const categoryAllLabel = categoryLabel.toLowerCase().includes("report") ? "All categories" : "All types";

  return (
    <div className={`${publicLayout.stackTight} ${className}`}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">{categoryLabel}</p>
        <div className="flex flex-wrap gap-2">
          <FilterPill active={categoryFilter === "all"} onClick={() => onCategoryFilterChange("all")}>
            {categoryAllLabel}
          </FilterPill>
          {categoryChoices.map((cat) => (
            <FilterPill key={cat} active={categoryFilter === cat} onClick={() => onCategoryFilterChange(cat)}>
              {cat}
            </FilterPill>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">{severityLabel}</p>
        <div className="flex flex-wrap gap-2">
          <FilterPill active={severityFilter === "all"} onClick={() => onSeverityFilterChange("all")}>
            All levels
          </FilterPill>
          {availableSeverities.map((sev) => (
            <FilterPill key={sev} active={severityFilter === sev} onClick={() => onSeverityFilterChange(sev)}>
              {sev}
            </FilterPill>
          ))}
        </div>
      </div>
    </div>
  );
}
