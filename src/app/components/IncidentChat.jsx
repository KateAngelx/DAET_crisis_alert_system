"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Lock, MessageSquare, Send } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchWithFreshSession } from "@/lib/authSession";
import { CHAT_MESSAGE_MAX, CHAT_ROLE_LABELS, groupChatMessages } from "@/lib/incidentChat";

const ROLE_BADGE = {
  admin: "bg-blue-100 text-blue-700",
  guide: "bg-green-100 text-green-700",
  tourist: "bg-zinc-100 text-zinc-600",
};

function time(value) {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Live message thread on an incident report, for the reporter, the guides involved and the
 * Tourism Office. New messages arrive instantly (Supabase Realtime), with a slow refresh as backup.
 */
export function IncidentChat({ incidentId, compact = false }) {
  const [state, setState] = useState({ loading: true, available: true, messages: [], readOnly: false, me: null, error: "" });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const listRef = useRef(null);

  const load = useCallback(async () => {
    if (!incidentId) return;
    try {
      const response = await fetchWithFreshSession(`/api/incidents/${incidentId}/messages`);
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setState((s) => ({ ...s, loading: false, error: json.error || "Could not load messages." }));
        return;
      }
      setState({ loading: false, available: json.available !== false, messages: json.messages || [], readOnly: Boolean(json.readOnly), me: json.me, error: "" });
    } catch {
      setState((s) => ({ ...s, loading: false, error: "Could not load messages." }));
    }
  }, [incidentId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    let channel = null;
    try {
      channel = supabase
        .channel(`incident_messages_${incidentId}_${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "incident_messages", filter: `incident_id=eq.${incidentId}` },
          () => load()
        )
        .subscribe();
    } catch {
      /* live updates unavailable: the 30-second refresh still works */
    }
    return () => {
      clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [incidentId, load]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [state.messages.length]);

  if (!state.available) return null;

  const send = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setSendError("");
    try {
      const response = await fetchWithFreshSession(`/api/incidents/${incidentId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not send the message.");
      setDraft("");
      setState((s) =>
        s.messages.some((m) => m.id === json.message.id) ? s : { ...s, messages: [...s.messages, json.message] }
      );
    } catch (error) {
      setSendError(error.message);
    } finally {
      setSending(false);
    }
  };

  const groups = groupChatMessages(state.messages);

  return (
    <section aria-label="Messages" className="rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <MessageSquare size={14} /> Messages
        </p>
        <p className="text-[10px] font-medium text-zinc-400">Reporter, guide and Tourism Office</p>
      </div>

      <div ref={listRef} className={`space-y-3 overflow-y-auto px-4 py-3 ${compact ? "max-h-56" : "max-h-80"}`}>
        {state.loading ? (
          <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={12} className="animate-spin" /> Loading messages…</p>
        ) : state.error ? (
          <p className="text-xs font-bold text-red-700">{state.error}</p>
        ) : groups.length === 0 ? (
          <p className="text-xs text-zinc-500">No messages yet. Ask a question or share an update about this report.</p>
        ) : (
          groups.map((group) => {
            const mine = group.senderId === state.me;
            return (
              <div key={group.messages[0].id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <p className="mb-1 flex items-center gap-1.5 text-[10px] text-zinc-400">
                  <span className="font-bold text-zinc-600">{mine ? "You" : group.senderName}</span>
                  <span className={`rounded px-1 py-px text-[8px] font-black uppercase ${ROLE_BADGE[group.senderRole] || ROLE_BADGE.tourist}`}>
                    {CHAT_ROLE_LABELS[group.senderRole] || group.senderRole}
                  </span>
                  {time(group.messages[0].created_at)}
                </p>
                {group.messages.map((m) => (
                  <p
                    key={m.id}
                    className={`mb-1 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                      mine ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {m.body}
                  </p>
                ))}
              </div>
            );
          })
        )}
      </div>

      {state.readOnly ? (
        <p className="flex items-center gap-2 border-t border-zinc-100 px-4 py-3 text-xs font-bold text-zinc-500">
          <Lock size={12} /> This report is closed. The messages are kept as a record.
        </p>
      ) : (
        <form onSubmit={send} className="border-t border-zinc-100 p-3">
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              maxLength={CHAT_MESSAGE_MAX}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(e);
                }
              }}
              placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
              aria-label="Message"
              className="min-w-0 flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
              aria-label="Send message"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          {sendError ? <p role="alert" className="mt-1 text-xs font-bold text-red-700">{sendError}</p> : null}
        </form>
      )}
    </section>
  );
}
