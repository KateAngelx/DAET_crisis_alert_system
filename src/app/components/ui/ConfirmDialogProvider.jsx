"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";

const ConfirmContext = createContext(null);

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const close = useCallback((value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options) => {
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ee1adc" },
      body: JSON.stringify({
        sessionId: "ee1adc",
        runId: "confirm-dialog",
        hypothesisId: "H1",
        location: "ConfirmDialogProvider.jsx:confirm",
        message: "Styled confirm dialog requested",
        data: {
          title: options.title,
          hasDescription: Boolean(options.description),
          descriptionLength: options.description?.length || 0,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ mode: "confirm", ...options });
    });
  }, []);

  const alert = useCallback((options) => {
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ee1adc" },
      body: JSON.stringify({
        sessionId: "ee1adc",
        runId: "confirm-dialog",
        hypothesisId: "H2",
        location: "ConfirmDialogProvider.jsx:alert",
        message: "Styled alert dialog requested",
        data: {
          title: options.title,
          hasDescription: Boolean(options.description),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({
        mode: "alert",
        confirmLabel: options.confirmLabel || "OK",
        ...options,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (dialog?.onConfirm) {
      const result = dialog.onConfirm();
      if (result && typeof result.then === "function") {
        setDialog((d) => ({ ...d, loading: true }));
        result
          .then((ok) => {
            if (ok !== false) close(true);
            else setDialog((d) => ({ ...d, loading: false }));
          })
          .catch(() => setDialog((d) => ({ ...d, loading: false })));
        return;
      }
    }
    close(true);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog ? (
        <ConfirmDialog
          open
          mode={dialog.mode}
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          variant={dialog.variant}
          requireText={dialog.requireText}
          requireTextLabel={dialog.requireTextLabel}
          loading={dialog.loading}
          onConfirm={handleConfirm}
          onCancel={() => close(false)}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return ctx;
}
