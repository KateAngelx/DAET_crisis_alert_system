"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { isNavActive } from "@/lib/dashboardNav";

export function InstalledBottomNav({ items, onMore }) {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="App"
    >
      <div className="grid grid-cols-5 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[52px] px-0.5 py-1.5 text-[9px] font-black uppercase tracking-tight leading-none ${
                active ? "text-blue-600" : "text-zinc-500"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span className="truncate max-w-full">{item.short}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex flex-col items-center justify-center gap-0.5 min-h-[52px] px-0.5 py-1.5 text-[9px] font-black uppercase tracking-tight leading-none text-zinc-500"
        >
          <Menu size={18} />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
