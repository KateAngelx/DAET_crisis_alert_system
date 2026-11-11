"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { REWARD_EARNED_EVENT } from "@/lib/rewardFeedback";

let rememberedPoints = { userId: null, balance: null };

function rememberPoints(userId, balance) {
  rememberedPoints = { userId, balance };
}

export function HeaderPoints({ enabled }) {
  const { user, isAuthenticated } = useAuthStore();
  const [balance, setBalance] = useState(() => (
    user?.id && rememberedPoints.userId === user.id ? rememberedPoints.balance : null
  ));

  useEffect(() => {
    let cancelled = false;
    async function loadBalance() {
      if (!enabled || !isAuthenticated || user?.role !== "tourist" || !user?.id) {
        rememberPoints(null, null);
        return;
      }
      try {
        const session = await getActiveSession();
        if (cancelled) return;
        if (rememberedPoints.userId === user.id && rememberedPoints.balance != null) {
          setBalance(rememberedPoints.balance);
        } else {
          setBalance(null);
        }
        if (!session?.access_token) return;
      const response = await fetch("/api/tourist/points?page=1&pageSize=1", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
        const result = await response.json().catch(() => ({}));
        if (cancelled || !response.ok) return;
        const next = Number(result.balance) || 0;
        rememberPoints(user.id, next);
        setBalance(next);
      } catch {
        if (!cancelled && rememberedPoints.userId !== user.id) {
          setBalance(null);
        }
      }
    }

    loadBalance();
    window.addEventListener(REWARD_EARNED_EVENT, loadBalance);
    return () => {
      cancelled = true;
      window.removeEventListener(REWARD_EARNED_EVENT, loadBalance);
    };
  }, [enabled, isAuthenticated, user]);

  if (!enabled || !isAuthenticated || user?.role !== "tourist") return null;

  const label = balance == null ? "Points" : `${balance.toLocaleString()} pts`;
  const description = "Placeholder balance only. Points are not redeemable and are not connected to the main wallet.";

  return (
    <Link
      href="/profile"
      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 text-[10px] font-black leading-none text-amber-800 hover:bg-amber-100 sm:gap-1.5 sm:px-2.5"
      title={`${label}. ${description}`}
      aria-label={`${label}. ${description}`}
    >
      <Coins size={14} className="shrink-0 text-amber-600" />
      {balance == null ? "Points" : `${balance.toLocaleString()} pts`}
    </Link>
  );
}
