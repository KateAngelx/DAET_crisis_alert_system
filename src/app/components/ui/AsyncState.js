import React from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Card } from "@/app/components/ui/Card";

export function ErrorState({ message, onRetry, title = "Unable to load data" }) {
  return (
    <Card className="p-8 text-center border-red-100 bg-red-50/30">
      <AlertTriangle size={40} className="mx-auto text-red-400 mb-4" />
      <p className="font-black uppercase text-xs tracking-widest text-red-600 mb-2">{title}</p>
      {message && (
        <p className="text-sm text-red-700/80 font-medium mb-4 max-w-md mx-auto">{message}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-colors"
        >
          <RefreshCw size={14} /> Try Again
        </button>
      )}
    </Card>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = "No data", description, action }) {
  return (
    <Card className="p-12 text-center border-zinc-100">
      <Icon size={48} className="mx-auto text-zinc-200 mb-4" />
      <p className="text-zinc-400 font-black uppercase text-xs tracking-widest">{title}</p>
      {description && (
        <p className="text-zinc-500 text-sm font-medium mt-2 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function AsyncState({
  loading,
  error,
  isEmpty,
  onRetry,
  loadingFallback,
  emptyFallback,
  errorFallback,
  children,
}) {
  if (loading) return loadingFallback;
  if (error) {
    return errorFallback ?? <ErrorState message={error} onRetry={onRetry} />;
  }
  if (isEmpty) return emptyFallback;
  return children;
}
