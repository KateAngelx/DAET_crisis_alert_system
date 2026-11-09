"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { InfoPageHero, PublicPageContent, PublicPageShell, PublicPanel } from "@/app/components/InfoPageHero";

const TYPES = [
  { value: "comment", label: "Comment" },
  { value: "feedback", label: "Feedback" },
  { value: "suggestion", label: "Suggestion" },
];

export default function CrisisFeedbackPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { alerts, fetchAlerts } = useCrisisStore();
  const [type, setType] = useState("comment");
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [alertId, setAlertId] = useState("");
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const activeAlerts = useMemo(
    () => alerts.filter((alert) => alert.status === "Active" && alert.is_public),
    [alerts]
  );
  const isTourist = !isAuthenticated || user?.role === "tourist";

  useEffect(() => {
    fetchAlerts();
    const queryAlertId = new URLSearchParams(window.location.search).get("alertId");
    if (queryAlertId) setAlertId(queryAlertId);
  }, [fetchAlerts]);

  useEffect(() => {
    let cancelled = false;
    async function loadItems() {
      setLoadingItems(true);
      try {
        const response = await fetch("/api/crisis-feedback");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load submissions.");
        if (!cancelled) setItems(result.items || []);
      } catch (error) {
        if (!cancelled) setFeedbackMessage({ type: "error", text: error.message });
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    }
    loadItems();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function submitFeedback(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedbackMessage(null);
    try {
      const headers = { "Content-Type": "application/json" };
      if (isAuthenticated && user?.role === "tourist") {
        const session = await getActiveSession();
        if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/crisis-feedback", {
        method: "POST",
        headers,
        body: JSON.stringify({
          submission_type: type,
          message,
          display_name: displayName,
          crisis_alert_id: alertId || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit your message.");

      setMessage("");
      setFeedbackMessage({
        type: "success",
        text: isAuthenticated
          ? "Your submission is awaiting admin review. Points are awarded only if an eligible tourist submission is approved."
          : "Your submission is awaiting admin review.",
      });
      setRefresh((value) => value + 1);
    } catch (error) {
      setFeedbackMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicPageShell>
      <InfoPageHero
        title="Crisis & Alert Feedback"
        description="Share a comment, feedback, or suggestion about crisis alerts and public safety information. Submissions are reviewed before they appear publicly."
      />
      <PublicPageContent>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <PublicPanel title="Submit a message" subtitle="Do not use this form to report an emergency.">
            {!isTourist ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                This form is for non-registered visitors and registered tourists. Sign out of your staff account to submit anonymously.
              </p>
            ) : (
              <form className="space-y-4" onSubmit={submitFeedback}>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-zinc-600">
                    Submission type
                  </span>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold"
                  >
                    {TYPES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-zinc-600">
                    Related public alert (optional)
                  </span>
                  <select
                    value={alertId}
                    onChange={(event) => setAlertId(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold"
                  >
                    <option value="">General Crisis Hub</option>
                    {activeAlerts.map((alert) => (
                      <option key={alert.id} value={alert.id}>{alert.title}</option>
                    ))}
                  </select>
                </label>

                {!isAuthenticated && (
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-zinc-600">
                      Display name (optional)
                    </span>
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      maxLength={80}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm"
                      placeholder="Anonymous"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-zinc-600">
                    Message
                  </span>
                  <textarea
                    required
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={1000}
                    rows={6}
                    className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm"
                    placeholder="Share your message about a public crisis alert or safety information..."
                  />
                  <span className="mt-1 block text-right text-xs text-zinc-400">{message.length}/1000</span>
                </label>

                {feedbackMessage && (
                  <p
                    role="status"
                    className={`rounded-xl p-3 text-sm font-medium ${
                      feedbackMessage.type === "success"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {feedbackMessage.text}
                  </p>
                )}

                {isAuthenticated && user?.role === "tourist" && (
                  <p className="text-xs text-zinc-500">
                    Registered tourist submissions may earn configured points only after admin approval. A daily limit applies.
                  </p>
                )}
                {!isAuthenticated && (
                  <p className="text-xs text-zinc-500">Anonymous submissions are not eligible for points.</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  {submitting ? "Submitting..." : "Submit for review"}
                </button>
              </form>
            )}
          </PublicPanel>

          <PublicPanel title="Approved submissions" subtitle="Only submissions approved by an administrator appear here.">
            {loadingItems ? (
              <p className="flex items-center gap-2 text-sm text-zinc-500" role="status">
                <Loader2 size={16} className="animate-spin" /> Loading approved submissions...
              </p>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center">
                <MessageSquare className="mx-auto mb-2 text-zinc-400" size={24} />
                <p className="text-sm font-bold text-zinc-600">No approved submissions yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                        {item.submission_type}
                      </span>
                      <time className="text-xs text-zinc-400" dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleString()}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-zinc-800">{item.message}</p>
                    <p className="mt-3 text-xs font-semibold text-zinc-500">
                      {item.display_name || "Anonymous"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </PublicPanel>
        </div>
      </PublicPageContent>
    </PublicPageShell>
  );
}
