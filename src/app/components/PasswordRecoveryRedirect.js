"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Sends legacy Supabase recovery redirects (homepage + hash) to /reset-password */
export function PasswordRecoveryRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || pathname === "/reset-password") return;

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const isRecovery =
      params.get("type") === "recovery" &&
      (params.get("access_token") || params.get("code"));

    if (isRecovery) {
      router.replace(`/reset-password${window.location.hash}`);
    }
  }, [pathname, router]);

  return null;
}
