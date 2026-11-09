"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { REWARD_EARNED_EVENT } from "@/lib/rewardFeedback";

export function RewardEarnedToast() {
  const [points, setPoints] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const showReward = (event) => {
      setPoints(event.detail.points);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPoints(null), 5000);
    };

    window.addEventListener(REWARD_EARNED_EVENT, showReward);
    return () => {
      window.removeEventListener(REWARD_EARNED_EVENT, showReward);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (points == null) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-20 z-[2100] flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-emerald-800 shadow-xl"
    >
      <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
      <span className="font-black">+{points} Points Earned!</span>
    </div>
  );
}
