import React from "react";

import { guideShell } from "@/lib/designSystem";



export function GuidePageShell({ children, className = "" }) {

  return <div className={`${guideShell.page} ${className}`}>{children}</div>;

}


