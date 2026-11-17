import React from "react";
import Link from "next/link";

/**
 * Two or three pages that belong together, shown as tabs (e.g. Alerts | Past alerts,
 * Groups | Tourists & invites). Each tab is its own page, so links and the back button work.
 * @param {{ key: string, label: string, href: string }[]} tabs
 */
export function SectionTabs({ tabs, active, label }) {
  return (
    <nav aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-1">
      {tabs.map((tab) => {
        const current = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${
              current ? "bg-white text-blue-700 shadow-sm ring-1 ring-zinc-200" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
