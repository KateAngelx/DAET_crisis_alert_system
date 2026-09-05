"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { publicLayout } from "@/app/components/InfoPageHero";

export function AboutNextSteps() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return (
      <div className={`${publicLayout.ctaCard} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6`}>
        <div>
          <p className="text-xs font-black uppercase text-blue-600 tracking-widest mb-1">Quick Access</p>
          <p className="text-sm text-blue-900 font-medium">
            Open the Crisis Hub for current alerts, or check My Reports and Notifications.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/crisis" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all">
            Crisis Hub <ArrowRight size={14} />
          </Link>
          <Link href="/crisis/reports" className="inline-flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest hover:bg-blue-50 transition-all">
            My Reports
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${publicLayout.ctaCard} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6`}>
      <div>
        <p className="text-xs font-black uppercase text-blue-600 tracking-widest mb-1">Next Steps</p>
        <p className="text-sm text-blue-900 font-medium">
          Register to receive alert notifications, or open the Crisis Hub to check current alerts.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/register" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all">
          Register <ArrowRight size={14} />
        </Link>
        <Link href="/crisis" className="inline-flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest hover:bg-blue-50 transition-all">
          Crisis Hub
        </Link>
      </div>
    </div>
  );
}
