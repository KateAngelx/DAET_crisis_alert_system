import React from "react";

export function Card({ children, className = "", glass = false }) {
  const glassStyles = glass
    ? "backdrop-blur-[10px] bg-white/20 border border-white/20"
    : "bg-white shadow-md border border-zinc-100";

  return (
    <div className={`rounded-2xl p-4 transition-all ${glassStyles} ${className}`}>
      {children}
    </div>
  );
}
