"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";

export function FloatingFaqButton() {
  const pathname = usePathname();
  const hidden = pathname === "/faq";

  useEffect(() => {
    if (hidden || typeof window === "undefined") return;
  }, [hidden, pathname]);

  if (hidden) return null;

  return (
    <Link
      href="/faq"
      data-floating-faq
      aria-label="Open frequently asked questions"
      className="fixed z-40 bottom-5 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 bg-blue-600 text-white pl-3 pr-4 py-3 rounded-full shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-white/20 font-black uppercase text-[10px] tracking-widest max-[380px]:px-3 max-[380px]:gap-1.5"
    >
      <span className="bg-white/20 p-1.5 rounded-full shrink-0">
        <HelpCircle size={16} strokeWidth={2.5} />
      </span>
      <span className="max-[380px]:sr-only">FAQ</span>
      <span className="hidden max-[380px]:inline">?</span>
    </Link>
  );
}
