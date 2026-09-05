"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, UserPlus, Loader2, Clock } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { useGuideStore } from "@/app/store/guideStore";
import { getTouristAvailabilityStatus } from "@/lib/assignmentStatus";
import { typography, iconSize } from "@/lib/designSystem";

const STATUS_BADGE = {
  available: "bg-green-100 text-green-700",
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
  const [assignments, setAssignments] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [actionId, setActionId] = useState(null);
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    if (!guideId || !tourGroupId) return;
    const result = await fetchAvailableTourists(guideId, tourGroupId);
    setAssignments(result.assignments || []);
    const pending = await fetchGroupPendingMembers(tourGroupId, guideId);
    setPendingCount(pending.length);

  };

  useEffect(() => {
    loadData();
  }, [guideId, tourGroupId]);

  const filteredTourists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableTourists;
    return availableTourists.filter(
      (t) =>
        t.full_name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.phone?.includes(q)
    );
  }, [availableTourists, searchQuery]);

  const handleInvite = async (touristId) => {
    setActionId(touristId);
    setMessage(null);
    const result = await sendAssignmentRequest({
      touristId,
      guideId,
      tourGroupId,
      assignedBy: guideId,
    });
    setActionId(null);
    if (result.success) {
      setMessage({ type: "success", text: "Assignment request sent. Waiting for tourist confirmation." });
      loadData();
    } else {
      setMessage({ type: "error", text: result.error || "Failed to send request." });
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
              <Users size={iconSize.section} /> Active Tourists
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
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name, email, or phone..."
            className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm font-medium"
          />
        </div>
      </Card>

      <Card className="border-zinc-100 overflow-hidden">
        {loading && filteredTourists.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-sm">Loading tourists...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-50/50">
                  <th className="p-4">Tourist</th>
                  <th className="p-4">Status</th>
                  {!compact && <th className="p-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTourists.length === 0 ? (
                  <tr>
                    <td colSpan={compact ? 2 : 3} className="p-8 text-center text-zinc-400 text-sm">
                      No registered tourists available yet. Tourists must register and sign in before they appear here.
                    </td>
                  </tr>
                ) : (
                  filteredTourists.map((tourist) => {
                    const avail = getTouristAvailabilityStatus(tourist.id, assignments, guideId, tourGroupId);
                    return (
                      <tr key={tourist.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="p-4">
                          <p className="font-bold text-zinc-900">{tourist.full_name}</p>
                          <p className="text-xs text-zinc-500">{tourist.email || tourist.phone || "—"}</p>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${STATUS_BADGE[avail.status]}`}>
                            {avail.label}
                          </span>
                          {avail.status === "under_other" && avail.assignment?.guide?.full_name && (
                            <p className="text-xs text-zinc-400 mt-1">{avail.assignment.guide.full_name}</p>
                          )}
                        </td>
                        {!compact && (
                          <td className="p-4 text-right">
                            {avail.status === "available" && (
                              <button
                                type="button"
                                disabled={actionId === tourist.id}
                                onClick={() => handleInvite(tourist.id)}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-50"
                              >
                                {actionId === tourist.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                                Set as My Tourist
                              </button>
                            )}
                            {avail.status === "pending" && (
                              <span className="text-[10px] font-black uppercase text-orange-600">Request Sent</span>
                            )}
                            {avail.status === "assigned" && (
                              <span className="text-[10px] font-black uppercase text-green-600">Confirmed</span>
                            )}
                            {avail.status === "under_other" && (
                              <span className="text-[10px] font-black uppercase text-zinc-400">View</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
