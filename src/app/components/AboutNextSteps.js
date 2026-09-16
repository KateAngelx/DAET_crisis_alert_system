"use client";

import { useAuthStore } from "@/app/store/crisisStore";
import { PublicPanel } from "@/app/components/InfoPageHero";

export function AboutNextSteps() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return (
      <PublicPanel title="Quick access" subtitle="Signed-in shortcuts">
        <p className="text-sm text-zinc-600 font-medium">
          Use the menu above to open Crisis Hub, My Reports, or Notifications.
        </p>
      </PublicPanel>
    );
  }

  return (
    <PublicPanel title="Next steps" subtitle="Get started with CONNECT-DAET">
      <p className="text-sm text-zinc-600 font-medium">
        Register to receive alert notifications, or open Crisis Hub from the menu to check current alerts.
      </p>
    </PublicPanel>
  );
}
