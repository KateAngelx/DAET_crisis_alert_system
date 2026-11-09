import React from "react";
import { typography } from "@/lib/designSystem";

export function GuidePageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col gap-3 text-left sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className={typography.pageTitle}>{title}</h1>
        {description ? (
          <p className={`${typography.description} mt-1 max-w-3xl`}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
