"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { useCrisisStore } from "@/app/store/crisisStore";

function formatTime(value) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Tells people when they are offline and that what they see is the copy saved on their phone. */
export function OfflineStatusBanner() {
  const [offline, setOffline] = useState(false);
  const offlineSavedAt = useCrisisStore((state) => state.offlineSavedAt);

  useEffect(() => {
    const update = () => setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline && !offlineSavedAt) return null;

  const savedTime = formatTime(offlineSavedAt);
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-w-xl items-start gap-3 rounded-2xl bg-zinc-900 p-3 text-white shadow-2xl sm:bottom-4"
    >
      <WifiOff size={18} className="mt-0.5 shrink-0 text-yellow-400" />
      <div className="min-w-0 flex-1 text-xs">
        <p className="font-black uppercase tracking-widest text-yellow-400">{offline ? "You are offline" : "Connection problem"}</p>
        <p className="mt-0.5 text-zinc-200">
          {savedTime ? `Showing alerts saved on this phone at ${savedTime}. ` : "New alerts cannot load right now. "}
          In an emergency call <a href="tel:911" className="font-black underline">911</a>.
        </p>
      </div>
      <Link href="/~offline" className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/20">
        Emergency info
      </Link>
    </div>
  );
}
