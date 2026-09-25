"use client";

import React, { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { useGuideStore } from "@/app/store/guideStore";
import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";

export function MarkTourDoneButton({
  groupId,
  guideId,
  groupName,
  onSuccess,
  className = "",
  size = "default",
}) {
  const { updateTourGroupStatus } = useGuideStore();
  const { confirm, alert } = useConfirm();
  const [loading, setLoading] = useState(false);

  const handleDone = async () => {
    const label = groupName ? `"${groupName}"` : "this tour group";
    const ok = await confirm({
      title: `Mark ${label} as done?`,
      description: "Tourists will be unassigned and pending requests will be cancelled.",
      confirmLabel: "Mark as Done",
      cancelLabel: "Not yet",
      variant: "success",
    });
    if (!ok) return;

    setLoading(true);
    const result = await updateTourGroupStatus(groupId, "completed", guideId);
    setLoading(false);

    if (result.success) {
      onSuccess?.();
    } else {
      await alert({
        title: "Could not complete tour",
        description: result.error || "Something went wrong. Try again or contact support.",
        variant: "danger",
      });
    }
  };

  const sizeClass =
    size === "sm"
      ? "px-3 py-2 text-[9px] gap-1.5"
      : "px-4 py-2.5 text-[10px] gap-2";

  return (
    <button
      type="button"
      onClick={handleDone}
      disabled={loading}
      className={`inline-flex items-center justify-center bg-green-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 transition-colors shrink-0 ${sizeClass} ${className}`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <CheckCircle size={14} />
      )}
      {loading ? "Saving…" : "Mark as Done"}
    </button>
  );
}
