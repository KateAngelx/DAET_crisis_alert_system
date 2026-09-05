"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL — emergency alerts live on Crisis Hub. */
export default function PublicAlertsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/crisis");
  }, [router]);

  return null;
}
