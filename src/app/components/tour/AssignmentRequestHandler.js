"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { GuideAssignmentRequestModal } from "@/app/components/tour/GuideAssignmentRequestModal";

export function AssignmentRequestHandler() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const {
    pendingAssignment,
    fetchPendingAssignmentForTourist,
    acceptAssignmentRequest,
    declineAssignmentRequest,
  } = useGuideStore();

  const loadPending = useCallback(() => {
    if (isAuthenticated && user?.role === "tourist" && user?.id) {
      fetchPendingAssignmentForTourist(user.id);
    }
  }, [isAuthenticated, user?.role, user?.id, fetchPendingAssignmentForTourist]);

  useEffect(() => {
    loadPending();
    const interval = setInterval(loadPending, 30000);
    return () => clearInterval(interval);
  }, [loadPending]);

  const handleClose = useCallback(
    (redirectToProfile = false) => {
      if (user?.id) {
        fetchPendingAssignmentForTourist(user.id);
      }
      if (redirectToProfile) {
        router.push("/profile");
      }
    },
    [user?.id, fetchPendingAssignmentForTourist, router]
  );

  if (!isAuthenticated || user?.role !== "tourist" || !pendingAssignment) {
    return null;
  }

  return (
    <GuideAssignmentRequestModal
      open={!!pendingAssignment}
      assignment={pendingAssignment}
      onAccept={(id) => acceptAssignmentRequest(id, user.id)}
      onDecline={(id) => declineAssignmentRequest(id, user.id)}
      onClose={() => handleClose(true)}
    />
  );
}
