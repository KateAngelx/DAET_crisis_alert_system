import React from "react";
import { portalShell, typography } from "@/lib/designSystem";

export function GuidePageHeader({ title, description, action }) {
  return (
    <div
      className={`${portalShell.pageIntro} flex flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="min-w-0">
        <p className={`${typography.statLabel} mb-1 tracking-[0.2em] text-purple-700`}>
          Guide Portal
        </p>
        <h1 className={`${typography.pageTitle} mb-1`}>{title}</h1>
        {description ? (
          <p className={`${portalShell.pageIntroDescription} max-w-3xl`}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
