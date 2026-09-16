import React from "react";

import {

  outlinedCard,

  getStatCardAccent,

  getSeverityOutline,

  getPriorityOutline,

  cardTouchShadow,

} from "@/lib/designSystem";



export function OutlinedCard({

  variant = "accent",

  accent = "blue",

  severity,

  priority,

  compact = false,

  interactive = false,

  padding,

  className = "",

  children,

  ...rest

}) {

  const styles = getStatCardAccent(accent);

  let borderClass = styles.border;



  if (variant === "severity") {

    borderClass = getSeverityOutline(severity).border;

  } else if (variant === "priority") {

    borderClass = getPriorityOutline(priority).border;

  }



  const radius = compact ? outlinedCard.radiusCompact : outlinedCard.radius;

  const pad = padding || (compact ? outlinedCard.statPaddingCompact : outlinedCard.statPadding);

  const touchShadow = interactive ? cardTouchShadow : "";

  const groupClass = interactive ? "group" : "";



  return (

    <div

      className={`${outlinedCard.base} ${radius} ${borderClass} ${pad} ${touchShadow} ${groupClass} ${className}`}

      {...rest}

    >

      {children}

    </div>

  );

}


