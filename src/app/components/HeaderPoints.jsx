"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { REWARD_EARNED_EVENT } from "@/lib/rewardFeedback";

export function HeaderPoints({ variant = "chip" }) {
  const { user, isAuthenticated } = useAuthStore();
  const [balance, setBalance] = useState(null);

  const loadBalance = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "tourist" || !user?.id) {
      setBalance(null);
      return;
    }
    try {
      const session = await getActiveSession();
      if (!session?.access_token) return;
      const response = await fetch("/api/tourist/points?page=1&pageSize=1", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return;
      setBalance(Number(result.balance) || 0);
    } catch {
      setBalance(null);
    }
  }, [isAuthenticated, user?.id, user?.role]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    const refresh = () => {
      loadBalance();
    };
    window.addEventListener(REWARD_EARNED_EVENT, refresh);
    return () => window.removeEventListener(REWARD_EARNED_EVENT, refresh);
  }, [loadBalance]);

  if (!isAuthenticated || user?.role !== "tourist" || balance == null) return null;

  const label = `${balance.toLocaleString()} pts`;

  if (variant === "menu") {
    return (
      <Link
        href="/profile"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-widest text-amber-800 hover:bg-amber-50"
      >
        <Coins size={16} className="shrink-0 text-amber-600" />
        {label}
      </Link>
    );
  }

  if (variant === "inline") {
    return (
      <span className="text-amber-700" title="Your points">
        {label}
      </span>
    );
  }

  return (
    <span className="max-w-[2.6rem] truncate text-[8px] font-black leading-none text-amber-800" title={label}>
      {balance.toLocaleString()}
    </span>
  );
}
