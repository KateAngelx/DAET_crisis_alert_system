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

}) {

  const showHeader = title || subtitle || action;

  const headerClass = compact ? portalShell.panelHeaderCompact : portalShell.panelHeader;

  const bodyPad = compact ? portalShell.panelBodyCompact : portalShell.panelBody;



  return (

    <section className={`${portalShell.panel} ${className}`}>

      {showHeader ? (

        <div

          className={`${headerClass} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2`}

        >

          <div className="min-w-0">

            {title ? (

              <h2 className={`${typography.sectionTitle} text-zinc-500`}>{title}</h2>

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


