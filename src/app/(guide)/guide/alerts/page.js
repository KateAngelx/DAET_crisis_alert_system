"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL — emergency alerts live on Guide Crisis Hub. */
export default function GuideAlertsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/guide/crisis");
  }, [router]);

  return null;
}
