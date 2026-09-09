"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL — resolved alerts archive. */
export default function PublicAlertsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/crisis/resolved");
  }, [router]);

  return null;
}
