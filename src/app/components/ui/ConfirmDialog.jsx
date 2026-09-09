"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";

const VARIANTS = {
  danger: {
    icon: AlertTriangle,
    iconClass: "text-red-600",
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-orange-600",
    buttonClass: "bg-orange-600 hover:bg-orange-700 text-white",
  },
  success: {
    icon: CheckCircle,
    iconClass: "text-green-600",
    buttonClass: "bg-green-600 hover:bg-green-700 text-white",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-600",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  mode = "confirm",
  requireText,
  requireTextLabel,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [typed, setTyped] = useState("");
  const styles = VARIANTS[variant] || VARIANTS.danger;
  const Icon = styles.icon;
  const textOk = !requireText || typed.trim() === requireText;

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 text-left shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-2.5 rounded-2xl bg-zinc-50 shrink-0 ${styles.iconClass}`}>
            <Icon size={28} />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h3 id="confirm-dialog-title" className="text-lg font-black uppercase tracking-tight text-zinc-900 leading-snug">
              {title}
            </h3>
            {description ? (
              <p className="text-sm text-zinc-600 font-medium leading-relaxed mt-2">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {requireText ? (
          <div className="mb-5">
            <label className="text-[10px] font-black uppercase text-zinc-400 block mb-2">
              {requireTextLabel || `Type ${requireText} to confirm`}
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-red-500"
              autoComplete="off"
            />
          </div>
        ) : null}

        <div className="flex gap-3">
          {mode === "confirm" && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3.5 bg-zinc-100 text-zinc-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !textOk}
            className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 transition-colors ${styles.buttonClass}`}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
