"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/store/crisisStore";
import {
  InfoPageHero,
  PublicPageShell,
  PublicPageContent,
  PublicPanel,
} from "@/app/components/InfoPageHero";
import { GuestIncidentReportForm } from "@/app/components/GuestIncidentReportForm";

const OPEN_INCIDENT_MODAL_KEY = "daet-open-incident-modal";

/**
 * Report an incident.
 * Signed-in users go to My Reports with the report form open (photos, tracking).
 * Walk-in tourists without an account can report here directly.
 */
export default function ReportIncidentPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthStore();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    sessionStorage.setItem(OPEN_INCIDENT_MODAL_KEY, "1");
    router.replace("/crisis/reports");
  }, [isAuthenticated, loading, router]);

  if (loading || isAuthenticated) return null;

  return (
    <PublicPageShell>
      <InfoPageHero
        title="Report a problem"
        description="No account needed. Tell the Daet Municipal Tourism Office what happened and how to reach you."
      />
      <PublicPageContent>
        <PublicPanel title="Your report">
          <GuestIncidentReportForm />
        </PublicPanel>
      </PublicPageContent>
    </PublicPageShell>
  );
}
