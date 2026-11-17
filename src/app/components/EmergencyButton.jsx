"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileWarning, Phone, Radio, Siren, X } from "lucide-react";
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
 */
export function EmergencyButton() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [sentRef, setSentRef] = useState(null);

  // Close after moving to another page.
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
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100"
              aria-label="Close emergency help"
            >
              <X size={18} />
            </button>
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
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close emergency help" : "Emergency help: hotlines and report"}
        className={`fixed right-3 ${open ? "hidden" : ""} ${bottom} z-[85] flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl ring-4 ring-red-200 hover:bg-red-700`}
      >
        <Siren size={18} /> Emergency
      </button>

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
