"use client";

import React, { useMemo } from "react";
import { publicLayout } from "@/app/components/InfoPageHero";
import { portalShell } from "@/lib/designSystem";

export const DEFAULT_SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"];
export const DEFAULT_CRISIS_TYPE_OPTIONS = ["General", "Health", "Security", "Weather"];

export function FilterPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors touch-manipulation ${
        active ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function MobileFilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block md:hidden">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
        {label}
      </span>
      <select
        className={portalShell.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
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

  const categorySelectOptions = useMemo(
    () => [
      { value: "all", label: categoryAllLabel },
      ...categoryChoices.map((cat) => ({ value: cat, label: cat })),
    ],
    [categoryAllLabel, categoryChoices]
  );

  const severitySelectOptions = useMemo(
    () => [
      { value: "all", label: "All levels" },
      ...availableSeverities.map((sev) => ({ value: sev, label: sev })),
    ],
    [availableSeverities]
  );

  return (
    <div className={`${publicLayout.stackTight} ${className}`}>
      <div className="grid grid-cols-1 gap-3 md:hidden">
        <MobileFilterSelect
          label={categoryLabel}
          value={categoryFilter}
          onChange={onCategoryFilterChange}
          options={categorySelectOptions}
        />
        <MobileFilterSelect
          label={severityLabel}
          value={severityFilter}
          onChange={onSeverityFilterChange}
          options={severitySelectOptions}
        />
      </div>

      <div className="hidden md:block space-y-4">
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
    </div>
  );
}
