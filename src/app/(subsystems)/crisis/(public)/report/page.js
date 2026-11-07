"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/store/crisisStore";

/** Legacy route — redirects to My Reports with the report modal open. */
export default function ReportIncidentPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/crisis/reports?report=1");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  return null;
}
