"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DangerousLocationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/crisis/admin/routes?tab=areas");
  }, [router]);

  return null;
}
