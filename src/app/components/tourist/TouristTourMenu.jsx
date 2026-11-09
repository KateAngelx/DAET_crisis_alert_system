"use client";

import { useEffect, useState } from "react";
import { Compass, MapPin, X } from "lucide-react";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { DestinationModal } from "@/app/components/tour/DestinationModal";
import { formatTourRoute } from "@/lib/tourGroupRoute";
import { portalShell } from "@/lib/designSystem";

export function TouristTourMenu({ onOpen }) {
  const { user, isAuthenticated } = useAuthStore();
  const { alerts, fetchAlerts } = useCrisisStore();
  const { touristActiveGroup, fetchTouristActiveGroup } = useGuideStore();
  const [open, setOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "tourist" || !user?.id) return;
    fetchTouristActiveGroup(user.id);
  }, [isAuthenticated, user?.id, user?.role, fetchTouristActiveGroup]);

  const group = touristActiveGroup?.tour_group;
  const guide = touristActiveGroup?.guide;
  if (!isAuthenticated || user?.role !== "tourist" || !group) return null;

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-purple-700 hover:bg-purple-50"
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        <Compass size={16} className="shrink-0" />
        My tour
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="my-tour-title"
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-700">My tour</p>
                <h2 id="my-tour-title" className="mt-1 text-lg font-black text-zinc-900">{group.name}</h2>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100"
                aria-label="Close tour"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm font-bold text-zinc-800">{guide?.full_name || "Guide pending"}</p>
            {guide?.phone ? <p className="mt-1 text-xs font-medium text-zinc-500">{guide.phone}</p> : null}
            <p className="mt-3 text-sm font-medium text-blue-700">{formatTourRoute(group)}</p>
            <button
              type="button"
              className={`mt-5 ${portalShell.btnPrimary}`}
              onClick={() => {
                fetchAlerts();
                setDestinationOpen(true);
              }}
            >
              <MapPin size={14} /> View destination
            </button>
          </div>
        </div>
      ) : null}
      <DestinationModal
        open={destinationOpen}
        onClose={() => setDestinationOpen(false)}
        group={group}
        guide={guide}
        members={[{ id: user.id, tourist: { full_name: user.name, nationality: user.nationality } }]}
        alerts={alerts}
        editable={false}
      />
    </>
  );
}
