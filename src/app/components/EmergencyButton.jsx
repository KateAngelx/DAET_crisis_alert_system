"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, FileWarning, Phone, Radio, Siren, X } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { ReportIncidentModal } from "@/app/components/ReportIncidentModal";
import { allEmergencyHotlines } from "@/lib/siteInfo";
import { FEATURE_NAMES } from "@/lib/featureNames";
import { useHydrated } from "@/lib/useHydrated";

const HIDDEN_ON = ["/login", "/register", "/forgot-password", "/reset-password"];
/**
 * Rule 5 for every role: emergency help is one tap away on every screen.
 * Opens the hotlines plus the role's own next step:
 * guest → report form page, tourist/guide → report form here, admin → Send alert.
 *
 * Launcher defaults to icon-only; chevrons expand or collapse the label.
 */
export function EmergencyButton() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [sentRef, setSentRef] = useState(null);
  const [launcherCompact, setLauncherCompact] = useState(true);

  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!hydrated || HIDDEN_ON.includes(pathname)) return null;

  const role = isAuthenticated ? user?.role : "guest";
  const bottom = "bottom-[calc(var(--dock-offset,0rem)+1rem+env(safe-area-inset-bottom))]";
  const actionClass =
    "flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-red-700 hover:bg-red-50";

  let action = null;
  if (role === "admin") {
    action = (
      <Link href="/crisis/command" className={actionClass}>
        <Radio size={16} /> {FEATURE_NAMES.sendAlert}
      </Link>
    );
  } else if (role === "tourist" || role === "guide") {
    action = (
      <button
        type="button"
        className={actionClass}
        onClick={() => {
          setOpen(false);
          setReportOpen(true);
        }}
      >
        <FileWarning size={16} /> {FEATURE_NAMES.reportProblem}
      </button>
    );
  } else {
    action = (
      <Link href="/crisis/report" className={actionClass}>
        <FileWarning size={16} /> {FEATURE_NAMES.reportProblem}
      </Link>
    );
  }

  const otherHotlines = allEmergencyHotlines.filter((line) => line.number !== "911");

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="emergency-sheet-title"
          className={`fixed right-3 ${bottom} z-[85] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-red-200 bg-white p-4 shadow-2xl`}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p id="emergency-sheet-title" className="text-sm font-black uppercase tracking-tight text-red-700">
                Emergency help
              </p>
              <p className="text-xs font-medium text-zinc-500">If someone is in danger, call first.</p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100"
                aria-label="Collapse emergency help"
                title="Collapse"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100"
                aria-label="Close emergency help"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <a
            href="tel:911"
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white shadow-sm hover:bg-red-700"
          >
            <Phone size={16} /> Call 911
          </a>
          {action}

          <ul className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-100">
            {otherHotlines.map((line) => (
              <li key={line.name}>
                <a
                  href={`tel:${line.tel || line.number}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-zinc-50"
                >
                  <span className="font-semibold text-zinc-700">{line.name}</span>
                  <span className="font-black text-red-700">{line.number}</span>
                </a>
              </li>
            ))}
          </ul>
          {sentRef ? (
            <p className="mt-2 text-xs font-bold text-green-700">Report sent: {sentRef}</p>
          ) : null}
        </div>
      ) : (
        <div
          className={`fixed right-3 ${bottom} z-[85] flex items-stretch overflow-hidden rounded-full shadow-lg ring-2 ring-red-200/80`}
        >
          {launcherCompact ? (
            <>
              <button
                type="button"
                onClick={() => setLauncherCompact(false)}
                className="flex items-center bg-red-50 px-2 text-red-700 hover:bg-red-100 border-r border-red-200"
                aria-label="Show Emergency label"
                title="Expand"
              >
                <ChevronLeft size={18} strokeWidth={2.5} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={false}
                className="flex h-11 w-11 items-center justify-center bg-red-600 text-white hover:bg-red-700"
                aria-label="Emergency help: hotlines and report"
              >
                <Siren size={20} aria-hidden />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={false}
                className="flex items-center gap-2 bg-red-600 py-2.5 pl-4 pr-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-700"
                aria-label="Emergency help: hotlines and report"
              >
                <Siren size={17} aria-hidden /> Emergency
              </button>
              <button
                type="button"
                onClick={() => setLauncherCompact(true)}
                className="flex items-center border-l border-red-500 bg-red-700 px-2 text-white hover:bg-red-800"
                aria-label="Emergency icon only"
                title="Minimize"
              >
                <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
              </button>
            </>
          )}
        </div>
      )}

      <ReportIncidentModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSuccess={(incident) => {
          setSentRef(incident?.reference_number || null);
          setOpen(true);
        }}
      />
    </>
  );
}