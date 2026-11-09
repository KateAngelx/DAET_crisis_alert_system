"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/store/crisisStore";

const OPEN_INCIDENT_MODAL_KEY = "daet-open-incident-modal";

/** Legacy route — redirects to My Reports with the report modal open. */
export default function ReportIncidentPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      sessionStorage.setItem(OPEN_INCIDENT_MODAL_KEY, "1");
      router.replace("/crisis/reports");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, router]);

  return null;
}
