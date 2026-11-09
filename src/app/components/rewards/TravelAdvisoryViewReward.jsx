"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { notifyRewardEarned } from "@/lib/rewardFeedback";

export function TravelAdvisoryViewReward({ advisoryId, activityType, viewed }) {
  const { user } = useAuthStore();
  const [resultState, setResultState] = useState(null);
  const [errorState, setErrorState] = useState(null);
  const [submittingKey, setSubmittingKey] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const submittedKey = useRef(null);
  const itemKey = user?.id && advisoryId ? `${user.id}:${activityType}:${advisoryId}` : null;
  const result = resultState?.itemKey === itemKey ? resultState.value : null;
  const error = errorState?.itemKey === itemKey ? errorState.value : null;
  const submitting = submittingKey === itemKey;

  useEffect(() => {
    if (!viewed || user?.role !== "tourist" || !itemKey || submittedKey.current === itemKey) return;

    (async () => {
      submittedKey.current = itemKey;
      setSubmittingKey(itemKey);
      setErrorState({ itemKey, value: null });
      try {
        const session = await getActiveSession();
        if (!session?.access_token) throw new Error("Sign in again to record this view.");

        const response = await fetch("/api/rewards/travel-advisories/view", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ advisoryId, activityType }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Could not record this view.");
        }

        setResultState({ itemKey, value: payload.result });
        if (payload.result?.status === "awarded") {
          notifyRewardEarned(payload.result.points, `travel-advisory:${itemKey}`);
        }
      } catch (requestError) {
        if (submittedKey.current === itemKey) {
          submittedKey.current = null;
        }
        setErrorState({ itemKey, value: requestError.message || "Could not record this view." });
      } finally {
        setSubmittingKey((current) => (current === itemKey ? null : current));
      }
    })();
  }, [activityType, advisoryId, itemKey, retryCount, user?.role, viewed]);

  if (!viewed || user?.role !== "tourist") return null;

  if (submitting) {
    return (
      <p className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-500" role="status">
        <Loader2 size={14} className="animate-spin" /> Checking reward...
      </p>
    );
  }

  if (result?.status === "awarded") {
    return (
      <p className="flex items-center justify-center gap-2 text-sm font-bold text-green-700" role="status">
        <CheckCircle2 size={16} /> {result.points} points added to your balance.
      </p>
    );
  }

  if (result?.status === "already_awarded") {
    return (
      <p className="text-center text-xs font-bold text-emerald-700" role="status">
        Already earned points for this item.
      </p>
    );
  }

  if (result?.status === "rewards_disabled" || result?.status === "activity_disabled") {
    return (
      <p className="text-center text-xs font-medium text-zinc-500" role="status">
        {result.status === "rewards_disabled"
          ? "The Rewards Program is currently turned off."
          : "Points for viewing this information are currently turned off."}
      </p>
    );
  }

  if (result?.status === "advisory_not_found") {
    return (
      <p className="text-center text-xs font-medium text-zinc-500" role="status">
        This information is not eligible for points.
      </p>
    );
  }

  if (result) {
    return (
      <p className="text-center text-xs font-medium text-red-600" role="alert">
        Could not confirm this item for reward points.
      </p>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-xs font-medium text-red-600" role="alert">{error}</p>
        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600"
        >
          <RefreshCw size={12} /> Try again
        </button>
      </div>
    );
  }

  return null;
}
