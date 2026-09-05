"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { typography, iconSize } from "@/lib/designSystem";

export function AuthBackLink() {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-1.5 mb-4 ${typography.button} text-zinc-500 hover:text-blue-600 transition-colors`}
    >
      <ArrowLeft size={iconSize.inline} />
      Back to site
    </Link>
  );
}

export function AuthShell({ children }) {
  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-gradient-to-b from-zinc-50 via-white to-zinc-100 text-foreground">
      <main className="flex-1 flex items-center justify-center px-4 py-4 overflow-hidden min-h-0">
        {children}
      </main>

      <footer className="shrink-0 py-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Official crisis alert system · Daet, Camarines Norte
        </p>
      </footer>
    </div>
  );
}
