"use client";

import React, { useEffect, useCallback } from "react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { GuideAssignmentRequestModal } from "@/app/components/tour/GuideAssignmentRequestModal";

export function AssignmentRequestHandler() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    pendingAssignment,
    fetchPendingAssignmentForTourist,
    acceptAssignmentRequest,
    declineAssignmentRequest,
  } = useGuideStore();

  const role = user?.role;
  const userId = user?.id;
  const loadPending = useCallback(() => {
    if (isAuthenticated && role === "tourist" && userId) {
      fetchPendingAssignmentForTourist(userId);
    }
  }, [isAuthenticated, role, userId, fetchPendingAssignmentForTourist]);

  useEffect(() => {
    loadPending();
    const interval = setInterval(loadPending, 30000);
    return () => clearInterval(interval);
  }, [loadPending]);

  const handleClose = useCallback(() => {
    if (userId) {
      fetchPendingAssignmentForTourist(userId);
    }
  }, [userId, fetchPendingAssignmentForTourist]);

  if (!isAuthenticated || user?.role !== "tourist" || !pendingAssignment) {
    return null;
  }

  return (
    <GuideAssignmentRequestModal
      open={!!pendingAssignment}
      assignment={pendingAssignment}
      onAccept={(id) => acceptAssignmentRequest(id, user.id)}
      onDecline={(id) => declineAssignmentRequest(id, user.id)}
      onClose={handleClose}
    />
  );
}
