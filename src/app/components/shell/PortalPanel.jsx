import React from "react";

import { portalShell, typography } from "@/lib/designSystem";



export function PortalPanel({

  title,

  subtitle,

  action,

  children,

  className = "",

  bodyClassName = "",

  noPadding = false,

  compact = false,
  section,
  badgeCount,
  badgeLabel = "active",
  badgeTone = "blue",
}) {

  const showHeader = title || subtitle || action;

  const headerClass = compact ? portalShell.panelHeaderCompact : portalShell.panelHeader;

  const bodyPad = compact ? portalShell.panelBodyCompact : portalShell.panelBody;



  return (

    <section data-profile-section={section} className={`${portalShell.panel} ${className}`}>

      {showHeader ? (

        <div

          className={`${headerClass} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2`}

        >

          <div className="min-w-0">
            {title ? (
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`${typography.sectionTitle} text-zinc-500`}>{title}</h2>
                {badgeCount > 0 ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                      badgeTone === "red"
                        ? "bg-red-100 text-red-700"
                        : badgeTone === "orange"
                          ? "bg-orange-100 text-orange-700"
                          : badgeTone === "green"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                    }`}
                    aria-label={`${badgeCount} ${badgeLabel}`}
                  >
                    <span className="tabular-nums">{badgeCount}</span> {badgeLabel}
                  </span>
                ) : null}
              </div>
            ) : null}

            {subtitle ? (

              <p className="text-xs text-zinc-400 font-medium mt-0.5">{subtitle}</p>

            ) : null}

          </div>

          {action ? <div className="shrink-0">{action}</div> : null}

        </div>

      ) : null}

      <div className={noPadding ? bodyClassName : `${bodyPad} ${bodyClassName}`}>

        {children}

      </div>

    </section>

  );

}

