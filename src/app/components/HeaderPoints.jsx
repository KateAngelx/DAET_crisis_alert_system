"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { REWARD_EARNED_EVENT } from "@/lib/rewardFeedback";

let rememberedPoints = { userId: null, balance: null };

function rememberPoints(userId, balance) {
  rememberedPoints = { userId, balance };
}

export function HeaderPoints({ variant = "chip" }) {
  const { user, isAuthenticated } = useAuthStore();
  const [balance, setBalance] = useState(() => (
    user?.id && rememberedPoints.userId === user.id ? rememberedPoints.balance : null
  ));

  const loadBalance = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "tourist" || !user?.id) {
      rememberPoints(null, null);
      setBalance(null);
      return;
    }
    if (rememberedPoints.userId === user.id && rememberedPoints.balance != null) {
      setBalance(rememberedPoints.balance);
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
      const next = Number(result.balance) || 0;
      rememberPoints(user.id, next);
      setBalance(next);
    } catch {
      if (rememberedPoints.userId !== user.id) {
        setBalance(null);
      }
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

  if (!isAuthenticated || user?.role !== "tourist") return null;

  const label = balance == null ? "Points" : `${balance.toLocaleString()} pts`;

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
      <span className="inline-block min-w-[3.5rem] text-amber-700" title="Your points">
        {balance == null ? "\u00a0" : label}
      </span>
    );
  }

  return (
    <span className="inline-block min-w-[2.4rem] max-w-[2.8rem] truncate text-center text-[8px] font-black leading-none text-amber-800" title={label}>
      {balance == null ? "\u00a0" : balance.toLocaleString()}
    </span>
  );
}
