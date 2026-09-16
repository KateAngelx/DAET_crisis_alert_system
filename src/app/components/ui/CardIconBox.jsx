import React from "react";

export function CardIconBox({ boxClass = "", children, size = "md", className = "" }) {
  const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-lg border ${boxClass} ${className}`}
    >
      {children}
    </div>
  );
}
