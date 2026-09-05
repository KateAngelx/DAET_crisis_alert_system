"use client";

import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";
import { typography, iconSize } from "@/lib/designSystem";

export function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-zinc-50 via-white to-zinc-100 text-foreground">
      <header className="w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className={`flex items-center gap-2 text-blue-600 ${typography.brand}`}>
            <div className="bg-blue-600 rounded-lg size-8 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Zap size={iconSize.brand} className="text-white" fill="white" />
            </div>
            <span className={typography.brand}>CONNECT-DAET</span>
          </Link>
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 ${typography.button} text-zinc-500 hover:text-blue-600 transition-colors`}
          >
            <ArrowLeft size={iconSize.inline} />
            Back to site
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </main>

      <footer className="py-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Official crisis alert system · Daet, Camarines Norte
        </p>
      </footer>
    </div>
  );
}
