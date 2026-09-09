"use client";

import { useAuthStore } from "@/app/store/crisisStore";
import { publicLayout } from "@/app/components/InfoPageHero";

export function AboutNextSteps() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return (
      <div className={publicLayout.ctaCard}>
        <p className="text-xs font-black uppercase text-blue-600 tracking-widest mb-1">Quick Access</p>
        <p className="text-sm text-blue-900 font-medium">
          Use the menu above to open Crisis Hub, My Reports, or Notifications.
        </p>
      </div>
    );
  }

  return (
    <div className={publicLayout.ctaCard}>
      <p className="text-xs font-black uppercase text-blue-600 tracking-widest mb-1">Next Steps</p>
      <p className="text-sm text-blue-900 font-medium">
        Register to receive alert notifications, or open Crisis Hub from the menu to check current alerts.
      </p>
    </div>
  );
}
