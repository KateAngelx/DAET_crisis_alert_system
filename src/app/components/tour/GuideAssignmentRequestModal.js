"use client";

import React, { useState } from "react";
import { X, MapPin, Calendar, CheckCircle, User, Loader2 } from "lucide-react";
import { formatTourRoute, formatTourDate } from "@/lib/tourGroupRoute";
import { typography, iconSize } from "@/lib/designSystem";

export function GuideAssignmentRequestModal({
  open,
  assignment,
  onAccept,
  onDecline,
  onClose,
}) {
  const [loading, setLoading] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(null);

  if (!open || !assignment) return null;

  const guide = assignment.guide;
  const group = assignment.tour_group;

  const handleAccept = async () => {
    setError(null);
    setLoading("accept");
    const result = await onAccept(assignment.id);
    setLoading(null);

    if (result?.success) {
      setConfirmed(true);
    } else {
      setError(result?.error || "Could not confirm guide. Please try again.");
    }
  };

  const handleDecline = async () => {
    setError(null);
    setLoading("decline");
    const result = await onDecline(assignment.id);
    setLoading(null);

    if (result?.success) {
      onClose();
    } else {
      setError(result?.error || "Could not decline request. Please try again.");
    }
  };

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={iconSize.empty} className="text-green-600" />
          </div>
          <h2 className={`${typography.heroTitle} mb-2`}>Guide Confirmed</h2>
          <p className="text-sm text-zinc-600 leading-relaxed">
            You are now assigned to <strong>{guide?.full_name}</strong> for{" "}
            <strong>{group?.name}</strong>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="bg-blue-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">
                Guide Assignment Request
              </p>
              <h2 className={typography.cardTitle}>
                {guide?.full_name || "A guide"} wants to be your tour guide
              </h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/10 rounded-full hidden" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
            <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Tour Group</p>
            <p className={`font-black text-zinc-900 ${typography.cardTitle}`}>{group?.name || "—"}</p>
            <p className={`${typography.bodySm} font-bold text-blue-600 flex items-center gap-2 mt-2`}>
              <MapPin size={iconSize.inline} /> {formatTourRoute(group)}
            </p>
            {formatTourDate(group) && (
              <p className={`${typography.bodySm} text-zinc-600 flex items-center gap-2 mt-2`}>
                <Calendar size={iconSize.inline} /> {formatTourDate(group)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
            <div className="p-2 bg-purple-100 rounded-xl">
              <User size={iconSize.section} className="text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400">Your Guide</p>
              <p className="font-bold text-zinc-900">{guide?.full_name}</p>
              {guide?.phone && <p className="text-xs text-zinc-500">{guide.phone}</p>}
            </div>
          </div>

          <p className="text-sm text-zinc-600 font-medium text-center">
            Do you want to confirm this guide for this tour group?
          </p>

          {error && (
            <p className="text-sm text-red-600 font-medium text-center bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={!!loading}
              onClick={handleDecline}
              className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-700 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading === "decline" ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Decline"}
            </button>
            <button
              type="button"
              disabled={!!loading}
              onClick={handleAccept}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === "accept" ? <Loader2 size={16} className="animate-spin" /> : "Confirm Guide"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
