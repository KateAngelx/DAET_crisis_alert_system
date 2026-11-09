"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check, Eye, EyeOff, Loader2, MessageSquare, X,
} from "lucide-react";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";
import { getActiveSession } from "@/lib/authSession";
import { ListPager } from "@/app/components/shell/ListPager";
import { adminShell } from "@/lib/designSystem";

const TYPES = ["comment", "feedback", "suggestion"];
const STATUSES = ["pending", "approved", "rejected", "removed"];
const PAGE_SIZE = 10;
const STATUS_BADGES = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-green-50 text-green-700 ring-green-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  removed: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

async function adminFetch(url, options = {}) {
  const session = await getActiveSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export default function AdminCrisisFeedbackPage() {
  const { confirm } = useConfirm();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [rewardSettings, setRewardSettings] = useState({
    enabled: true,
    minimum: 1,
    default: 5,
    maximum: 100,
    dailySubmissionCap: 1,
  });
  const [awardAmounts, setAwardAmounts] = useState({});
  const [awardFormId, setAwardFormId] = useState(null);
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      const response = await adminFetch(`/api/admin/crisis-feedback?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load crisis feedback.");
      setItems(result.items || []);
      setTotal(result.total || 0);
      setProfiles(result.profiles || {});
      setRewardSettings(result.rewardSettings || {
        enabled: false,
        minimum: 1,
        default: 5,
        maximum: 100,
        dailySubmissionCap: 1,
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [page, status, type]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  async function moderate(item, action) {
    if (action === "removed") {
      const approved = await confirm({
        title: "Remove this submission?",
        description: "This will soft-remove the unawarded submission and retain its moderation record. It cannot earn points.",
        confirmLabel: "Remove submission",
        variant: "danger",
      });
      if (!approved) return;
    }

    setBusyId(item.id);
    setError(null);
    try {
      const points = Number(awardAmounts[item.id] ?? rewardSettings.default);
      if (action === "award" &&
          (!Number.isSafeInteger(points) || points < rewardSettings.minimum || points > rewardSettings.maximum)) {
        throw new Error(`Award amount must be a whole number from ${rewardSettings.minimum} to ${rewardSettings.maximum}.`);
      }
      const response = await adminFetch("/api/admin/crisis-feedback", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          action,
          note: notes[item.id] || null,
          ...(action === "award" ? { points } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update this submission.");
      if (action === "award") setAwardFormId(null);
      await loadSubmissions();
      if (result.notificationWarning) setError(`Saved successfully, but notification delivery failed: ${result.notificationWarning}`);
    } catch (moderationError) {
      setError(moderationError.message);
    } finally {
      setBusyId(null);
    }
  }

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Crisis & Alert Feedback"
        description="Review public comments, feedback, and suggestions in a separate moderation workflow."
      />

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <AdminPanel
        title="Registered tourist submissions"
        subtitle="Review comments, feedback, and suggestions. Approval and point awards are separate actions."
        bodyClassName="flex flex-col min-h-0"
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-zinc-500">Type</span>
            <select
              value={type}
              onChange={(event) => changeFilter(setType, event.target.value)}
              className={adminShell.select}
            >
              <option value="">All types</option>
              {TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-zinc-500">Status</span>
            <select
              value={status}
              onChange={(event) => changeFilter(setStatus, event.target.value)}
              className={adminShell.select}
            >
              <option value="">All statuses</option>
              {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>

        <div className="mb-3 text-xs font-medium text-zinc-500">
          {total} matching submission{total === 1 ? "" : "s"} · page {page} of {pageCount}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm font-medium text-zinc-500">
            <Loader2 size={17} className="animate-spin" /> Loading submissions...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm font-medium text-zinc-500">
            <MessageSquare className="mx-auto mb-2 text-zinc-400" size={26} />
            <p>No submissions match these filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[1080px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[9%]" />
                <col className="w-[27%]" />
                <col className="w-[16%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead className="border-b border-zinc-100 bg-zinc-50">
                <tr>
                  {["Type", "Message", "Tourist / submitted by", "Date submitted", "Status", "Actions"].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-400"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item) => {
                  const isPending = item.status === "pending";
                  const isApproved = item.status === "approved";
                  const busy = busyId === item.id;
                  return (
                    <tr key={item.id} className="align-top transition-colors hover:bg-zinc-50/70">
                      <td className="px-3 py-3">
                        <span className="inline-flex rounded bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700">
                          {item.submission_type}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-zinc-800">
                          {item.message}
                        </p>
                        <p className="mt-2 break-words text-[10px] leading-relaxed text-zinc-500">
                          <span className="font-bold text-zinc-400">Alert:</span>{" "}
                          {item.related_alert?.title || (item.crisis_alert_id ? item.crisis_alert_id : "General Crisis Hub")}
                        </p>
                        {item.moderation_note && (
                          <p className="mt-2 break-words rounded-md bg-zinc-50 p-2 text-[10px] text-zinc-600">
                            <strong>Latest note:</strong> {item.moderation_note}
                          </p>
                        )}
                        {item.moderation_events?.length > 0 && (
                          <details className="mt-2 text-[10px]">
                            <summary className="cursor-pointer font-bold text-blue-700">
                              Moderation history ({item.moderation_events.length})
                            </summary>
                            <ul className="mt-2 space-y-1 border-l-2 border-zinc-200 pl-2">
                              {item.moderation_events.map((event) => (
                                <li key={event.id} className="break-words text-zinc-600">
                                  <strong className="capitalize">{event.action}</strong>
                                  {" · "}{new Date(event.created_at).toLocaleString()}
                                  {event.points_awarded ? ` · ${event.points_awarded} points` : ""}
                                  {event.note ? ` · ${event.note}` : ""}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="break-words text-xs font-semibold leading-relaxed text-zinc-700">
                          {item.author?.full_name || item.display_name || "Tourist"}
                        </p>
                        {item.author?.email && (
                          <p className="mt-1 break-all text-[10px] text-zinc-500">{item.author.email}</p>
                        )}
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-zinc-400">
                          Registered tourist
                        </p>
                      </td>
                      <td className="px-3 py-3 text-[11px] leading-relaxed text-zinc-600">
                        <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <span className={`inline-flex rounded px-2 py-1 text-[9px] font-black uppercase tracking-wide ring-1 ring-inset ${STATUS_BADGES[item.status] || STATUS_BADGES.pending}`}>
                            {item.status}
                          </span>
                          {item.is_hidden && (
                            <span className="inline-flex rounded bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-zinc-500">
                              Hidden
                            </span>
                          )}
                          {item.awarded_at ? (
                            <span className="text-[10px] font-semibold leading-relaxed text-green-700">
                              Awarded {item.awarded_points} points · {new Date(item.awarded_at).toLocaleString()}
                              {item.awarded_by ? ` · ${profiles[item.awarded_by]?.full_name || item.awarded_by}` : ""}
                            </span>
                          ) : (
                            <span className="text-[10px] capitalize leading-relaxed text-zinc-500">
                              Reward: {item.reward_status.replaceAll("_", " ")}
                            </span>
                          )}
                          {item.approved_at && (
                            <span className="text-[9px] leading-relaxed text-zinc-500">
                              Approved by {profiles[item.approved_by]?.full_name || item.approved_by || "Admin"} · {new Date(item.approved_at).toLocaleString()}
                            </span>
                          )}
                          <span className="text-[9px] leading-relaxed text-zinc-400">
                            Moderated: {item.moderated_at ? new Date(item.moderated_at).toLocaleString() : "Not yet"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 flex-col items-start gap-2">
                          {isPending && (
                            <>
                              <label className="block w-full">
                                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-zinc-400">
                                  Moderation note (optional)
                                </span>
                                <textarea
                                  rows={2}
                                  maxLength={1000}
                                  value={notes[item.id] || ""}
                                  onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                                  className={`${adminShell.input} min-h-0 text-xs`}
                                />
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => moderate(item, "approved")}
                                  className={`${adminShell.btnSuccess} px-2.5 py-2 text-[9px] disabled:opacity-50`}
                                >
                                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => moderate(item, "rejected")}
                                  className={`${adminShell.btnGhost} border-amber-200 px-2.5 py-2 text-[9px] text-amber-700 hover:bg-amber-50 disabled:opacity-50`}
                                >
                                  <X size={13} /> Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => moderate(item, "removed")}
                                  className={`${adminShell.btnGhost} border-red-100 px-2.5 py-2 text-[9px] text-red-600 hover:bg-red-50 disabled:opacity-50`}
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          )}

                          {isApproved && (
                            <>
                              {item.submitter_category === "registered_tourist" &&
                                !item.awarded_at &&
                                item.reward_status !== "awarded" && (
                                  <div className="w-full rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">
                                    <p className="text-[10px] font-black text-zinc-800">Optional point award</p>
                                    <p className="mt-1 text-[9px] leading-relaxed text-zinc-600">
                                      {rewardSettings.minimum}–{rewardSettings.maximum} points; up to {rewardSettings.dailySubmissionCap} rewarded submission{rewardSettings.dailySubmissionCap === 1 ? "" : "s"} per tourist per Manila day.
                                    </p>
                                    {!rewardSettings.enabled && (
                                      <p className="mt-1 text-[9px] font-semibold text-amber-800">
                                        Rewards are disabled.
                                      </p>
                                    )}
                                    <button
                                      type="button"
                                      disabled={busy || !rewardSettings.enabled}
                                      onClick={() => {
                                        setAwardAmounts((current) => ({
                                          ...current,
                                          [item.id]: current[item.id] ?? rewardSettings.default,
                                        }));
                                        setAwardFormId(item.id);
                                      }}
                                      className={`${adminShell.btnPrimary} mt-2 px-2.5 py-2 text-[9px] disabled:opacity-50`}
                                    >
                                      Award Points
                                    </button>
                                    {awardFormId === item.id && rewardSettings.enabled && (
                                      <div className="mt-2 border-t border-blue-100 pt-2">
                                        <p className="mb-2 text-[9px] font-semibold text-zinc-700">
                                          {item.author?.full_name || item.display_name || "Tourist"} · {item.submission_type}
                                        </p>
                                        <label className="block">
                                          <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-zinc-500">
                                            Points ({rewardSettings.minimum}–{rewardSettings.maximum})
                                          </span>
                                          <input
                                            type="number"
                                            min={rewardSettings.minimum}
                                            max={rewardSettings.maximum}
                                            step="1"
                                            value={awardAmounts[item.id] ?? rewardSettings.default}
                                            onChange={(event) => setAwardAmounts((current) => ({
                                              ...current,
                                              [item.id]: event.target.value === "" ? "" : Number(event.target.value),
                                            }))}
                                            className={`${adminShell.input} text-xs`}
                                          />
                                        </label>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => moderate(item, "award")}
                                            className={`${adminShell.btnPrimary} px-2.5 py-2 text-[9px] disabled:opacity-50`}
                                          >
                                            {busy ? <Loader2 size={13} className="animate-spin" /> : null} Confirm Award
                                          </button>
                                          <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => setAwardFormId(null)}
                                            className={`${adminShell.btnGhost} px-2.5 py-2 text-[9px] disabled:opacity-50`}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              {!item.awarded_at && item.reward_status !== "awarded" && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => moderate(item, "removed")}
                                  className={`${adminShell.btnGhost} border-red-100 px-2.5 py-2 text-[9px] text-red-600 hover:bg-red-50 disabled:opacity-50`}
                                >
                                  Remove unawarded submission
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => moderate(item, item.is_hidden ? "unhidden" : "hidden")}
                                className={`${adminShell.btnGhost} px-2.5 py-2 text-[9px] disabled:opacity-50`}
                              >
                                {busy ? <Loader2 size={13} className="animate-spin" /> : item.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                                {item.is_hidden ? "Unhide" : "Hide"} from public view
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <ListPager page={page} pageCount={pageCount} onPage={setPage} disabled={loading} />
      </AdminPanel>
    </div>
  );
}
