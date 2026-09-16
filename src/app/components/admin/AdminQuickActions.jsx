"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { cardTouchShadow } from "@/lib/designSystem";

export function AdminQuickActions({ items = [] }) {
  if (!items.length) return null;

  return (
    <AdminPanel title="Quick actions" subtitle="Jump to common admin tasks">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((action) => (
          <Link key={action.href} href={action.href} className="block no-underline group">
            <div
              className={`rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 h-full ${cardTouchShadow} transition-all group-hover:border-zinc-300`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg border border-zinc-100 bg-white shrink-0 ${action.color || "text-blue-600"}`}
                >
                  <action.icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-zinc-900 text-xs uppercase tracking-wide">{action.title}</p>
                  <p className="text-[10px] font-bold text-zinc-400 mt-1 leading-snug">{action.sub}</p>
                </div>
                <ArrowRight
                  size={14}
                  className="text-zinc-300 group-hover:text-blue-600 shrink-0 mt-0.5 transition-colors"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AdminPanel>
  );
}
