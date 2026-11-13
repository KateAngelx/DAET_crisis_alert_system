"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { notifyRewardEarned } from "@/lib/rewardFeedback";

const SKIP_PREFIX = "connect-daet-start-guide-skipped:";

const STEPS = [
  {
    title: "Welcome to CONNECT-DAET",
    where: "This short guide shows where each section is.",
    detail: "Stay here until you are ready to enter, or skip it. You can open How to Use later from your profile.",
  },
  {
    title: "Crisis alerts",
    where: "Open Crisis Hub in the menu.",
    detail: "Active alerts, affected places, and safety instructions are listed there.",
  },
  {
    title: "Roads and hazards",
    where: "Open Roads & Travel in the menu.",
    detail: "Published routes, closures, and area hazards are on that page.",
  },
  {
    title: "Incident reports",
    where: "Open My Reports in the menu.",
    detail: "Submit a report from there, then use the same list to check its status.",
  },
  {
    title: "Feedback",
    where: "Open Feedback from the account menu.",
    detail: "Use it for comments about public safety and crisis alerts.",
  },
  {
    title: "Help from a tourist guide",
    where: "The request section is on the home page when the office has it turned on.",
    detail: "It is for tourism help, not emergencies. The office assigns a guide after you send a request.",
  },
  {
    title: "Notifications",
    where: "Use the bell in the header. Preferences are in Profile.",
    detail: "Your in-app inbox is there. Manage email, SMS, and in-app preferences in Profile; browser push is a separate setting on supported devices.",
  },
  {
    title: "Points",
    where: "Your points number is in the header. The full history is in Profile.",
    detail: "This is a placeholder balance only: points are not redeemable or connected to the main wallet. Marking this guide complete can add 10 points when the office has that reward turned on.",
  },
];

function skipKey(userId) {
  return `${SKIP_PREFIX}${userId}`;
}

export function TouristStartGuide() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [guideSettled, setGuideSettled] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onAuthScreen = pathname === "/login"
    || pathname === "/register"
    || pathname.startsWith("/forgot-password")
    || pathname.startsWith("/reset-password");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "tourist" || !user?.id || onAuthScreen) {
      setOpen(false);
      setGuideSettled(true);
      return undefined;
    }
    if (window.localStorage.getItem(skipKey(user.id)) === "1") {
      setOpen(false);
      setGuideSettled(true);
      return undefined;
    }

    setGuideSettled(false);
    let active = true;
    (async () => {
      try {
        const session = await getActiveSession();
        if (!session?.access_token) return;
        const response = await fetch("/api/tourist/guide-completion", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok || result.completed) {
          setOpen(false);
          return;
        }
        setStep(0);
        setOpen(true);
      } catch {
        if (active) setOpen(false);
      } finally {
        if (active) setGuideSettled(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated, onAuthScreen, user?.id, user?.role]);

  useEffect(() => {
    if (!guideSettled) return undefined;
    window.dispatchEvent(new CustomEvent("daet:start-guide", { detail: { open, settled: true } }));
    return undefined;
  }, [guideSettled, open]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const skip = () => {
    if (user?.id) window.localStorage.setItem(skipKey(user.id), "1");
    setOpen(false);
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Sign in again to finish the guide.");
      const response = await fetch("/api/tourist/guide-completion", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to save the guide.");
      if (result.status === "awarded" && result.rewardAwarded) {
        notifyRewardEarned(result.pointsAwarded, `tourist-guide-completion:${user.id}`);
      }
      if (user?.id) window.localStorage.setItem(skipKey(user.id), "1");
      setOpen(false);
    } catch (finishError) {
      setError(finishError.message || "Unable to save the guide.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2400] flex items-end justify-center bg-zinc-950/70 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-guide-title"
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
            Start guide · {step + 1} of {STEPS.length}
          </p>
          <h2 id="start-guide-title" className="mt-1 text-xl font-black tracking-tight text-zinc-900">
            {current.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={skip}
            disabled={saving}
            className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
          >
            Skip
          </button>
          {last ? (
            <button
              type="button"
              onClick={finish}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              I&apos;m ready
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((value) => value + 1)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700"
            >
              Next <ChevronRight size={15} />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="text-sm font-bold leading-relaxed text-zinc-900">{current.where}</p>
          <p className="text-sm leading-relaxed text-zinc-600">{current.detail}</p>
          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
