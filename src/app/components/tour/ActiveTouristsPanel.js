"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, UserPlus, Loader2, Clock } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { CategoryFilterSelect } from "@/app/components/shell/StatusRecordList";
import { useGuideStore } from "@/app/store/guideStore";
import { getTouristAvailabilityStatus } from "@/lib/assignmentStatus";
import { isUserOnline } from "@/lib/userActivity";
import { typography, iconSize } from "@/lib/designSystem";

const STATUS_BADGE = {
  available: "bg-green-100 text-green-700",
  unavailable: "bg-zinc-100 text-zinc-600",
  pending: "bg-orange-100 text-orange-700",
  assigned: "bg-blue-100 text-blue-700",
  under_other: "bg-zinc-100 text-zinc-600",
  declined: "bg-red-100 text-red-700",
};

export function ActiveTouristsPanel({ guideId, tourGroupId, tourGroupName, compact = false, hideTitle = false }) {
  const {
    availableTourists,
    fetchAvailableTourists,
    sendAssignmentRequest,
    fetchGroupPendingMembers,
    loading,
  } = useGuideStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignments, setAssignments] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [actionId, setActionId] = useState(null);
  const [message, setMessage] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!guideId || !tourGroupId) return undefined;

    fetchAvailableTourists(guideId, tourGroupId)
      .then(async (result) => {
        if (cancelled) return null;
        setAssignments(result.assignments || []);
        return fetchGroupPendingMembers(tourGroupId, guideId);
      })
      .then((pending) => {
        if (!cancelled && pending) setPendingCount(pending.length);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage({ type: "error", text: error.message || "Unable to load tourist invitations." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [guideId, tourGroupId, fetchAvailableTourists, fetchGroupPendingMembers, refreshKey]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRefreshKey((current) => current + 1);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const filteredTourists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return availableTourists.filter((tourist) => {
      const matchesSearch =
        !q ||
        tourist.full_name?.toLowerCase().includes(q) ||
        tourist.email?.toLowerCase().includes(q) ||
        tourist.phone?.includes(q);
      const currentAvailability = getTouristAvailabilityStatus(tourist.id, assignments, guideId, tourGroupId);
      const availability = isUserOnline(tourist)
        ? currentAvailability
        : { ...currentAvailability, status: "unavailable", label: "Unavailable (offline)" };
      return matchesSearch && (statusFilter === "all" || availability.status === statusFilter);
    });
  }, [availableTourists, searchQuery, assignments, guideId, tourGroupId, statusFilter]);

  const handleInvite = async (touristId) => {
    setActionId(touristId);
    setMessage(null);
    try {
      const result = await sendAssignmentRequest({
        touristId,
        guideId,
        tourGroupId,
        assignedBy: guideId,
      });
      if (result.success) {
        setMessage({ type: "success", text: "Invitation sent. The tourist will appear as confirmed after they accept." });
        setRefreshKey((current) => current + 1);
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send invitation." });
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to send invitation." });
    } finally {
      setActionId(null);
    }
  };

  if (!tourGroupId) {
    return (
      <Card className="p-8 text-center border-zinc-100">
        <Users size={32} className="mx-auto text-zinc-200 mb-2" />
        <p className="text-sm text-zinc-500 font-medium">Select a tour group to view active tourists.</p>
        <Link href="/guide/groups" className="text-[10px] font-black uppercase text-blue-600 hover:underline mt-3 inline-block">
          Manage Tour Groups
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {!hideTitle && (
          <div>
            <h2 className={`${typography.sectionTitle} flex items-center gap-2`}>
              <Users size={iconSize.section} /> Find &amp; Invite Tourists
            </h2>
            {tourGroupName && (
              <p className="text-xs text-zinc-500 mt-1">For tour group: <strong>{tourGroupName}</strong></p>
            )}
          </div>
        )}
        {hideTitle && tourGroupName && (
          <p className="text-xs text-zinc-500">Inviting to: <strong>{tourGroupName}</strong></p>
        )}
        {pendingCount > 0 && (
          <span className="text-[10px] font-black uppercase text-orange-600 flex items-center gap-1">
            <Clock size={12} /> {pendingCount} pending confirmation
          </span>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
          {message.text}
        </div>
      )}

      <Card className="p-4 border-zinc-100">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-zinc-400">Search tourists</span>
            <span className="relative block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, email, or phone..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </span>
          </label>
          <CategoryFilterSelect
            label="Availability"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "available", label: "Available to invite" },
              { value: "unavailable", label: "Unavailable (offline)" },
              { value: "pending", label: "Request sent" },
              { value: "assigned", label: "Confirmed" },
              { value: "under_other", label: "With another guide" },
              { value: "declined", label: "Declined" },
            ]}
          />
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {loading && filteredTourists.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-sm">Loading tourists...</div>
        ) : (
          <>
            <div className={`grid ${compact ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto_auto]"} gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400`}>
              <span>Tourist</span>
              <span>Status</span>
              {!compact && <span className="text-right">Action</span>}
            </div>
            {filteredTourists.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">
                {availableTourists.length === 0
                  ? "No registered tourists available yet. Tourists must register and sign in before they appear here."
                  : "No tourists match these filters."}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {filteredTourists.map((tourist) => {
                  const currentAvailability = getTouristAvailabilityStatus(tourist.id, assignments, guideId, tourGroupId);
                  const avail = isUserOnline(tourist)
                    ? currentAvailability
                    : { ...currentAvailability, status: "unavailable", label: "Unavailable (offline)" };
                  return (
                    <li
                      key={tourist.id}
                      className={`grid ${compact ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto_auto]"} items-center gap-3 px-4 py-3 hover:bg-zinc-50/70`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-zinc-900">{tourist.full_name}</span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">{tourist.email || tourist.phone || "—"}</span>
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${STATUS_BADGE[avail.status]}`}>
                        {avail.label}
                      </span>
                      {!compact && (
                        <span className="flex justify-end">
                          {avail.status === "available" ? (
                            <button
                              type="button"
                              disabled={actionId === tourist.id}
                              onClick={() => handleInvite(tourist.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-50"
                            >
                              {actionId === tourist.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                              Invite
                            </button>
                          ) : (
                            <span className={`text-right text-[9px] font-black uppercase ${avail.status === "unavailable" ? "text-zinc-500" : "text-zinc-400"}`}>
                              {avail.status === "unavailable" ? "Unavailable" : avail.status === "pending" ? "Request sent" : avail.status === "assigned" ? "Confirmed" : "—"}
                            </span>
                          )}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {!compact && tourGroupId && (
        <Link
          href={`/guide/groups/${tourGroupId}`}
          className="text-[10px] font-black uppercase text-blue-600 hover:underline inline-block"
        >
          Open full tour group management →
        </Link>
      )}
    </div>
  );
}
