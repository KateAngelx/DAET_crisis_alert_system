import React from "react";

import { guideShell, typography } from "@/lib/designSystem";



export function GuidePageHeader({ title, description, action }) {

  return (

    <div

      className={`${guideShell.pageIntro} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left`}

    >

      <div className="min-w-0">

        <p className={`${typography.statLabel} text-purple-600 tracking-[0.2em] mb-1`}>Guide portal</p>

        <h1 className={`${typography.pageTitle} mb-1`}>{title}</h1>

        {description ? <p className={`${typography.description} max-w-3xl`}>{description}</p> : null}

      </div>

      {action ? <div className="shrink-0">{action}</div> : null}

    </div>

  );

}


