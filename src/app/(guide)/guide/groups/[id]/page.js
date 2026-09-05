"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, UserPlus, UserMinus, Loader2, Compass, Phone, Navigation, Clock,
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DestinationButton, DestinationModal } from "@/app/components/tour/DestinationModal";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { TouristCardSkeleton } from "@/app/components/ui/Skeletons";
import { EmptyState } from "@/app/components/ui/AsyncState";
import { formatTourRoute } from "@/lib/tourGroupRoute";
import { typography } from "@/lib/designSystem";

export default function TourGroupDetailPage({ params }) {
  const { id } = React.use(params);
  const { user } = useAuthStore();
  const { alerts, fetchAlerts } = useCrisisStore();
  const { advisories, fetchAdvisories } = useRouteAdvisoryStore();
  const {
    activeGroup,
    groupMembers,
    fetchTourGroupById,
    fetchGroupMembers,
    removeTouristFromGroup,
    fetchGroupPendingMembers,
    updateTourGroupStatus,
    updateTourGroupRoute,
    loading,
  } = useGuideStore();

  const [actionId, setActionId] = useState(null);
  const [message, setMessage] = useState(null);
  const [showDestination, setShowDestination] = useState(false);
  const [pendingMembers, setPendingMembers] = useState([]);

  const loadData = async () => {
    if (!id || !user?.id) return;
    fetchTourGroupById(id, user.id);
    fetchGroupMembers(id, user.id);
    const pending = await fetchGroupPendingMembers(id, user.id);
    setPendingMembers(pending);
  };

  useEffect(() => {
    loadData();
    fetchAlerts();
    fetchAdvisories();
  }, [id, user?.id, fetchAlerts, fetchAdvisories]);

  const handleRemove = async (assignmentId) => {
    if (!window.confirm("Remove this tourist from the tour group?")) return;
    setActionId(assignmentId);
    setMessage(null);
    const result = await removeTouristFromGroup(assignmentId, id, user.id);
    setActionId(null);
    if (result.success) {
      setMessage({ type: "success", text: "Tourist removed from group." });
      loadData();
    } else {
      setMessage({ type: "error", text: result.error || "Failed to remove tourist." });
    }
  };

  const handleCompleteGroup = async () => {
    if (!window.confirm("Mark this tour group as completed? Pending requests will be cancelled.")) return;
    const result = await updateTourGroupStatus(id, "completed", user.id);
    if (result.success) {
      fetchTourGroupById(id, user.id);
      setMessage({ type: "success", text: "Tour group marked as completed." });
      loadData();
    }
  };

  if (loading && !activeGroup) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse" />
        <TouristCardSkeleton />
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <Card className="p-10 text-center">
        <p className="text-zinc-500 font-medium">Tour group not found.</p>
        <Link href="/guide/groups" className="text-blue-600 text-xs font-black uppercase mt-4 inline-block">Back to Tour Groups</Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <Link href="/guide/groups" className="inline-flex items-center gap-2 text-xs font-black uppercase text-zinc-400 hover:text-blue-600">
        <ArrowLeft size={14} /> All Tour Groups
      </Link>

      <Card className="p-6 border-purple-100">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-2xl">
              <Compass size={24} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900">{activeGroup.name}</h1>
              <p className="text-sm font-bold text-blue-600 flex items-center gap-1 mt-1">
                <Navigation size={14} /> {formatTourRoute(activeGroup)}
              </p>
              {activeGroup.trip_info && (
                <p className="text-sm text-zinc-600 mt-3 leading-relaxed">{activeGroup.trip_info}</p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 space-y-2">
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
              activeGroup.status === "active" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"
            }`}>
              {activeGroup.status}
            </span>
            <DestinationButton onClick={() => setShowDestination(true)} className="w-full justify-center" />
            <p className={`${typography.statValue} text-blue-600`}>{groupMembers.length}</p>
            <p className="text-[10px] font-black uppercase text-zinc-400">Confirmed Tourists</p>
            {activeGroup.status === "active" && (
              <button type="button" onClick={handleCompleteGroup} className="mt-3 text-[10px] font-black uppercase text-zinc-500 hover:text-red-600">
                Mark Completed
              </button>
            )}
          </div>
        </div>
      </Card>

      {message && (
        <div className={`p-4 rounded-2xl text-sm font-medium ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
          {message.text}
        </div>
      )}

      <Card className="p-5 border-blue-100 bg-blue-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-blue-700 flex items-center gap-2">
              <Users size={16} /> Invite Active Tourists
            </h2>
            <p className="text-sm text-zinc-600 mt-1">Search registered tourists and send assignment requests from the Active Tourists panel.</p>
          </div>
          <Link
            href={`/guide/tourists?group=${id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 shrink-0"
          >
            <UserPlus size={16} /> Manage Active Tourists
          </Link>
        </div>
      </Card>

      {pendingMembers.length > 0 && (
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
            <Clock size={16} /> Pending Confirmation ({pendingMembers.length})
          </h2>
          <div className="space-y-3">
            {pendingMembers.map((assignment) => (
              <Card key={assignment.id} className="p-4 border-orange-100 bg-orange-50/30">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-zinc-900">{assignment.tourist?.full_name}</p>
                    <p className="text-[10px] font-black uppercase text-orange-600 mt-1">Awaiting tourist confirmation</p>
                  </div>
                  <span className="text-xs text-zinc-400">
                    Sent {new Date(assignment.assigned_at).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
          <Users size={16} /> Confirmed Tourists ({groupMembers.length})
        </h2>
        {groupMembers.length === 0 ? (
          <EmptyState icon={Users} title="No confirmed tourists" description="Send assignment requests from Active Tourists. Tourists must confirm before appearing here." />
        ) : (
          <div className="space-y-3">
            {groupMembers.map((assignment) => (
              <Card key={assignment.id} className="p-4 border-zinc-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-zinc-900">{assignment.tourist?.full_name}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-zinc-500">
                      {assignment.tourist?.phone && (
                        <span className="flex items-center gap-1"><Phone size={11} /> {assignment.tourist.phone}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Confirmed {new Date(assignment.responded_at || assignment.assigned_at).toLocaleDateString()}
                    </p>
                  </div>
                  {activeGroup.status === "active" && (
                    <button
                      type="button"
                      disabled={actionId === assignment.id}
                      onClick={() => handleRemove(assignment.id)}
                      className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase shrink-0 disabled:opacity-50"
                    >
                      {actionId === assignment.id ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
                      Remove
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <DestinationModal
        open={showDestination}
        onClose={() => setShowDestination(false)}
        group={activeGroup}
        guide={activeGroup.guide || (user ? { full_name: user.name, phone: user.phone, email: user.email } : null)}
        members={groupMembers}
        alerts={alerts}
        routeAdvisories={advisories}
        editable
        onSave={async (updates) => {
          const result = await updateTourGroupRoute(id, user.id, updates);
          if (result.success) fetchTourGroupById(id, user.id);
          return result;
        }}
      />
    </div>
  );
}
