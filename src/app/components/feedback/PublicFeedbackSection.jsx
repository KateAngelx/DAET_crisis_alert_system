"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Lightbulb, Heart, Send, Sparkles } from "lucide-react";
import {
  FEEDBACK_BASE_TILTS,
  FEEDBACK_TILT_BUMPS,
  FEEDBACK_TYPE_LABELS,
} from "@/lib/feedbackConstants";
import { typography } from "@/lib/designSystem";

const TYPE_OPTIONS = [
  { value: "feedback", label: "Feedback", icon: Heart },
  { value: "comment", label: "Comment", icon: MessageCircle },
  { value: "suggestion", label: "Suggestion", icon: Lightbulb },
];

const TYPE_STYLES = {
  feedback: "border-pink-200 bg-pink-50/80 text-pink-700",
  comment: "border-blue-200 bg-blue-50/80 text-blue-700",
  suggestion: "border-amber-200 bg-amber-50/80 text-amber-800",
};

function FeedbackBubble({ item, index }) {
  const [bumpIndex, setBumpIndex] = useState(0);
  const [pressed, setPressed] = useState(false);

  const baseTilt = FEEDBACK_BASE_TILTS[index % FEEDBACK_BASE_TILTS.length];
  const bump = FEEDBACK_TILT_BUMPS[bumpIndex % FEEDBACK_TILT_BUMPS.length];
  const rotation = baseTilt + (pressed ? bump : 0);
  const typeStyle = TYPE_STYLES[item.feedback_type] || TYPE_STYLES.feedback;
  const typeLabel = FEEDBACK_TYPE_LABELS[item.feedback_type] || "Feedback";

  const handleInteract = useCallback(() => {
    setBumpIndex((i) => i + 1);
    setPressed(true);
    window.setTimeout(() => setPressed(false), 420);
  }, []);

  return (
    <button
      type="button"
      onClick={handleInteract}
      className={`shrink-0 w-[240px] sm:w-[280px] text-left rounded-[24px] border-2 px-5 py-4 shadow-lg shadow-zinc-200/60 transition-transform duration-300 ease-out hover:scale-[1.03] active:scale-[0.98] cursor-pointer select-none touch-manipulation ${typeStyle}`}
      style={{ transform: `rotate(${rotation}deg) scale(${pressed ? 1.04 : 1})` }}
      aria-label={`${typeLabel} from ${item.name || "Anonymous"}: ${item.message}`}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mb-1.5">{typeLabel}</p>
      <p className="text-sm font-medium leading-relaxed text-zinc-800 line-clamp-4">&ldquo;{item.message}&rdquo;</p>
      <p className="text-[10px] font-black uppercase tracking-widest mt-3 opacity-60">
        — {item.name || "Anonymous"}
      </p>
    </button>
  );
}

function MarqueeRow({ items, reverse = false, rowOffset = 0 }) {
  const loopItems = useMemo(() => [...items, ...items], [items]);
  if (!items.length) return null;

  return (
    <div className="relative overflow-hidden py-2 feedback-marquee-mask">
      <div
        className={`flex gap-4 sm:gap-5 w-max ${reverse ? "feedback-marquee-reverse" : "feedback-marquee"}`}
        style={{ animationDuration: reverse ? "38s" : "32s" }}
      >
        {loopItems.map((item, i) => (
          <FeedbackBubble key={`${item.id}-${i}`} item={item} index={i + rowOffset} />
        ))}
      </div>
    </div>
  );
}

export function PublicFeedbackSection() {
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const loadFeedback = useCallback(async () => {
    try {
      const res = await fetch("/api/feedback");
      const data = await res.json();
      if (Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch {
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const rowA = useMemo(() => items.filter((_, i) => i % 2 === 0), [items]);
  const rowB = useMemo(() => items.filter((_, i) => i % 2 === 1), [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!message.trim()) {
      setFormError("Please share your feedback, comment, or suggestion.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Anonymous",
          message: message.trim(),
          feedback_type: feedbackType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Could not submit feedback.");
        return;
      }

      if (data.item) {
        setItems((prev) => [data.item, ...prev].slice(0, 24));
      } else {
        await loadFeedback();
      }
      setMessage("");
      setFormSuccess("Thank you! Your message has been added to the community wall.");
    } catch {
      setFormError("Could not submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-zinc-50 to-white border-t border-zinc-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-4">
            <Sparkles size={14} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Community Voice</span>
          </div>
          <h2 className={`${typography.heroTitle} mb-2`}>Feedback & Suggestions</h2>
          <p className="text-sm text-zinc-500 font-medium max-w-xl mx-auto leading-relaxed">
            {items.length > 0
              ? "Share how CONNECT-DAET helps you, or suggest improvements. Tap any note below to tilt it — everyone can read and contribute."
              : "Be the first to share feedback, a comment, or a suggestion for Daet LGU. Your message will appear here for others to read."}
          </p>
        </div>

        {!loadingList && items.length === 0 && (
          <div className="mb-8 sm:mb-10 text-center py-8 rounded-[28px] border border-dashed border-zinc-200 bg-white/60">
            <p className="text-sm font-bold text-zinc-500">No community messages yet.</p>
            <p className="text-xs text-zinc-400 font-medium mt-1">Submit yours using the form below.</p>
          </div>
        )}

        {!loadingList && items.length > 0 && (
          <div className="mb-10 sm:mb-12 space-y-3">
            <MarqueeRow items={rowA.length ? rowA : items} rowOffset={0} />
            <MarqueeRow items={rowB.length ? rowB : items} reverse rowOffset={4} />
          </div>
        )}

        {loadingList && (
          <div className="flex justify-center py-10 mb-8">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto rounded-[32px] border border-zinc-200 bg-white shadow-xl shadow-zinc-200/40 p-6 sm:p-8 space-y-4"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">
            Send yours
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFeedbackType(value)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                  feedbackType === value
                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
                    : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-blue-200"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="feedback-name" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                Name (optional)
              </label>
              <input
                id="feedback-name"
                type="text"
                maxLength={80}
                disabled={submitting}
                placeholder="Anonymous"
                className="mt-1 w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <p className="text-[10px] text-zinc-400 font-medium pb-3">
                No login required — your message may appear in the marquee above.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="feedback-message" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
              Your message
            </label>
            <textarea
              id="feedback-message"
              required
              maxLength={500}
              rows={4}
              disabled={submitting}
              placeholder="Share feedback, a comment, or a suggestion for Daet LGU..."
              className="mt-1 w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1 text-right">
              {message.length}/500
            </p>
          </div>

          {formError && (
            <p className="text-xs font-bold text-red-600 text-center">{formError}</p>
          )}
          {formSuccess && (
            <p className="text-xs font-bold text-green-600 text-center">{formSuccess}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:bg-blue-300"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Submit {FEEDBACK_TYPE_LABELS[feedbackType]}
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
