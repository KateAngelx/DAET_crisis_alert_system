"use client";

import React from "react";
import { MapPin, Route } from "lucide-react";
import { FilterPill } from "@/app/components/shell/PublicCategorizedCardFilters";
import { iconSize } from "@/lib/designSystem";

const SECTIONS = [
  { id: "routes", label: "Routes", icon: Route },
  { id: "areas", label: "Area hazards", icon: MapPin },
];

/** Section tabs inside list panel — matches Command Center crisis type / severity pills */
export function RoadsHazardsSectionFilters({ activeSection, onSectionChange }) {
  return (
    <div className="shrink-0 mb-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Section</p>
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <FilterPill key={id} active={activeSection === id} onClick={() => onSectionChange(id)}>
            <span className="inline-flex items-center gap-1">
              <Icon size={iconSize.inlineSm} />
              {label}
            </span>
          </FilterPill>
        ))}
      </div>
    </div>
  );
}
