import React from "react";
import { sectionHeader } from "@/app/components/sectionHeader";

export function DashboardPageHeader({ title, description, action }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-left ${sectionHeader.contentGap}`}>
      <div>
        <h1 className={sectionHeader.title}>{title}</h1>
        {description && <p className={sectionHeader.description}>{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
