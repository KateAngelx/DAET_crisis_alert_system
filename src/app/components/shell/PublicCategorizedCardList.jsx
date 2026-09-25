"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { publicLayout } from "@/app/components/InfoPageHero";
import { PublicCardListPreview, PUBLIC_CARD_LIST_LIMIT } from "@/app/components/shell/PublicCardListPreview";
import { PublicListModal } from "@/app/components/shell/PublicListModal";
import { portalShell } from "@/lib/designSystem";

export {
  DEFAULT_SEVERITY_ORDER,
  DEFAULT_CRISIS_TYPE_OPTIONS,
  FilterPill,
} from "@/app/components/shell/PublicCategorizedCardFilters";
import {
  DEFAULT_SEVERITY_ORDER,
  FilterPill,
} from "@/app/components/shell/PublicCategorizedCardFilters";

function severityRank(severity, order) {
  const idx = order.indexOf(severity);
  return idx === -1 ? order.length : idx;
}

export function groupItemsByCategory(items, getCategory, getSeverity, severityOrder = DEFAULT_SEVERITY_ORDER) {
  const groups = new Map();
  for (const item of items) {
    const cat = getCategory(item) || "Other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(item);
  }
  for (const list of groups.values()) {
    list.sort(
      (a, b) =>
        severityRank(getSeverity(a), severityOrder) - severityRank(getSeverity(b), severityOrder)
    );
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function PublicCategorizedCardList({
  items,
  getCategory,
  getSeverity,
  categoryLabel = "Crisis type",
  severityLabel = "Severity",
  severityOrder = DEFAULT_SEVERITY_ORDER,
  renderItem,
  modalTitle,
  modalSubtitle,
  listClassName,
  getItemKey,
  limit,
  filtersClassName = "",
  listPaneClassName = "",
  categoryOptions = null,
  severityOptions = null,
  hideFilters = false,
  categoryFilter: controlledCategoryFilter,
  severityFilter: controlledSeverityFilter,
  onCategoryFilterChange,
  onSeverityFilterChange,
}) {
  const [internalCategoryFilter, setInternalCategoryFilter] = useState("all");
  const [internalSeverityFilter, setInternalSeverityFilter] = useState("all");
  const categoryFilter = controlledCategoryFilter ?? internalCategoryFilter;
  const severityFilter = controlledSeverityFilter ?? internalSeverityFilter;
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const filtersRef = useRef(null);

  const safeItems = items ?? [];
  const effectiveLimit = limit ?? PUBLIC_CARD_LIST_LIMIT;

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

  useEffect(() => {
    if (!listPaneClassName || !filtersRef.current) return;
    const el = filtersRef.current;
  }, [listPaneClassName, categoryChoices, availableSeverities]);

  const filteredItems = useMemo(() => {
    return safeItems.filter((item) => {
      const cat = getCategory(item);
      const sev = getSeverity(item);
      if (categoryFilter !== "all" && cat !== categoryFilter) return false;
      if (severityFilter !== "all" && sev !== severityFilter) return false;
      return true;
    });
  }, [safeItems, categoryFilter, severityFilter, getCategory, getSeverity]);

  const applyFilter = (kind, value) => {
    const nextCategory = kind === "category" ? value : categoryFilter;
    const nextSeverity = kind === "severity" ? value : severityFilter;
    const nextCount = safeItems.filter((item) => {
      const cat = getCategory(item);
      const sev = getSeverity(item);
      if (nextCategory !== "all" && cat !== nextCategory) return false;
      if (nextSeverity !== "all" && sev !== nextSeverity) return false;
      return true;
    }).length;
    if (kind === "category") {
      if (onCategoryFilterChange) onCategoryFilterChange(value);
      else setInternalCategoryFilter(value);
    } else {
      if (onSeverityFilterChange) onSeverityFilterChange(value);
      else setInternalSeverityFilter(value);
    }
  };

  const renderModalBody = (modalItems) => {
    const groups = groupItemsByCategory(modalItems, getCategory, getSeverity, severityOrder);
    return (
      <div className={publicLayout.stack}>
        {groups.map(([category, groupItems]) => (
          <section key={category}>
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2 pb-1 border-b border-zinc-100">
              {category}
            </h3>
            <div className={`${listClassName || publicLayout.stackTight} mt-2`}>
              {groupItems.map((item, index) => {
                const key = getItemKey ? getItemKey(item, index) : item?.id ?? index;
                return <React.Fragment key={key}>{renderItem(item, index)}</React.Fragment>;
              })}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className={`${publicLayout.stackTight} flex flex-col flex-1 min-h-0`}>
      {!hideFilters ? (
        <div ref={filtersRef} className={`${publicLayout.stackTight} shrink-0 ${filtersClassName}`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">{categoryLabel}</p>
            <div className="flex flex-wrap gap-2">
              <FilterPill active={categoryFilter === "all"} onClick={() => applyFilter("category", "all")}>
                All types
              </FilterPill>
              {categoryChoices.map((cat) => (
                <FilterPill key={cat} active={categoryFilter === cat} onClick={() => applyFilter("category", cat)}>
                  {cat}
                </FilterPill>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">{severityLabel}</p>
            <div className="flex flex-wrap gap-2">
              <FilterPill active={severityFilter === "all"} onClick={() => applyFilter("severity", "all")}>
                All levels
              </FilterPill>
              {availableSeverities.map((sev) => (
                <FilterPill key={sev} active={severityFilter === sev} onClick={() => applyFilter("severity", sev)}>
                  {sev}
                </FilterPill>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className={`${publicLayout.stackTight} ${listPaneClassName}`}>
        {filteredItems.length === 0 ? (
          <p className="text-sm text-zinc-500 font-medium py-4">No items match the selected type and severity.</p>
        ) : (
          <>
            <PublicCardListPreview
              items={filteredItems}
              limit={limit}
              renderItem={renderItem}
              modalTitle={modalTitle}
              modalSubtitle={
                modalSubtitle ??
                `${filteredItems.length} shown · ${safeItems.length} total`
              }
              listClassName={listClassName}
              getItemKey={getItemKey}
              renderModalBody={renderModalBody}
            />
            {safeItems.length > effectiveLimit && filteredItems.length <= effectiveLimit ? (
              <button
                type="button"
                onClick={() => setCatalogModalOpen(true)}
                className={`${portalShell.btnGhost} w-full py-3 shrink-0`}
              >
                View all ({safeItems.length}) <ChevronDown size={14} className="inline" />
              </button>
            ) : null}
          </>
        )}
      </div>

      <PublicListModal
        open={catalogModalOpen}
        onClose={() => setCatalogModalOpen(false)}
        title={modalTitle}
        subtitle={`${safeItems.length} total — grouped by type`}
      >
        {renderModalBody(safeItems)}
      </PublicListModal>
    </div>
  );
}
