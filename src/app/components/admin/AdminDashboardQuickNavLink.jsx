"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { iconSize, portalLayout } from "@/lib/designSystem";

/** Quick nav row item — matches Command Center stats footer links */
export function AdminDashboardQuickNavLink({ href, icon: Icon, label, meta }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline no-underline"
    >
      {Icon ? <Icon size={iconSize.inlineSm} /> : null}
      {label}
      {meta ? (
        <span className="text-zinc-400 font-bold normal-case tracking-normal">({meta})</span>
      ) : null}
      <ArrowRight size={iconSize.inlineSm} className="opacity-70" />
    </Link>
  );
}

export function AdminDashboardQuickNavDivider() {
  return <span className="hidden sm:inline text-zinc-200" aria-hidden>|</span>;
}

export function AdminDashboardQuickNavRow({ children }) {
  return <div className={portalLayout.dashboardQuickLinks}>{children}</div>;
}
