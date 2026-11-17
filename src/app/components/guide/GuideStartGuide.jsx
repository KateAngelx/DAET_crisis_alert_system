"use client";

import React, { useState } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useHydrated } from "@/lib/useHydrated";

const doneKey = (userId) => `connect-daet:guide-welcome-done:${userId}`;

/** Three steps only. The rest is on the guide's How to Use page. */
const STEPS = [
  {
    title: "1. Today shows what needs you",
    where: "Open Today first, every time.",
    detail: "\"Needs you now\" lists help requests, missing tourists, tourists who have not checked in during an alert, and tours past their end date.",
  },
  {
    title: "2. Groups: make a tour, invite tourists",
    where: "Open Groups, tap New tour group, then invite tourists in the Tourists & invites tab.",
    detail: "Tourists appear in your group after they accept. When the tour ends, mark it done; it moves to Past tours under More.",
  },
  {
    title: "3. In an emergency",
    where: "Tap the red Emergency button: call 911 first, then report.",
    detail: "When an alert asks for a check-in, open Alerts and mark each of your tourists safe, needs help or missing.",
  },
];

function readDone(userId) {
  try {
    return window.localStorage.getItem(doneKey(userId)) === "1";
  } catch {
    return true;
  }
}

export function GuideStartGuide() {
  const { user } = useAuthStore();
  const hydrated = useHydrated();
  const [step, setStep] = useState(0);
  const [closedFor, setClosedFor] = useState(null);

  if (!hydrated || user?.role !== "guide" || !user?.id) return null;
  if (closedFor === user.id || readDone(user.id)) return null;

  const close = () => {
    try {
      window.localStorage.setItem(doneKey(user.id), "1");
    } catch {
      // Private mode: it shows again next time, which is fine.
    }
    setClosedFor(user.id);
  };

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[2400] flex items-end justify-center bg-zinc-950/70 p-3 sm:items-center sm:p-6">
      <div role="dialog" aria-modal="true" aria-labelledby="guide-welcome-title" className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">
            Welcome, guide · step {step + 1} of {STEPS.length}
          </p>
          <h2 id="guide-welcome-title" className="mt-1 text-xl font-black tracking-tight text-zinc-900">{current.title}</h2>
        </div>
        <div className="space-y-3 px-5 py-5 sm:px-6">
          <p className="text-sm font-bold leading-relaxed text-zinc-900">{current.where}</p>
          <p className="text-sm leading-relaxed text-zinc-600">{current.detail}</p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4 sm:px-6">
          <button type="button" onClick={close} className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-800">
            Skip
          </button>
          <button
            type="button"
            onClick={last ? close : () => setStep((value) => value + 1)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-800"
          >
            {last ? <><CheckCircle2 size={15} /> I&apos;m ready</> : <>Next <ChevronRight size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
