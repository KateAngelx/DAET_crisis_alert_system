"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { CardIconBox } from "@/app/components/ui/CardIconBox";
import { AlertSeverityIcon, AlertTypeIcon } from "@/app/components/ui/cardTypeIcons";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { geocodeLocation } from "@/lib/geocodeLocation";
import { getSeverityOutline, iconSize } from "@/lib/designSystem";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { supabase } from "@/lib/supabaseClient";
import { notifyRewardEarned } from "@/lib/rewardFeedback";

const DAET_CENTER = [14.1122, 122.9553];

export function AlertDetailModal({ alert, onClose }) {
  const [mapCenter, setMapCenter] = useState(DAET_CENTER);
  const [mapReady, setMapReady] = useState(false);
  const [viewedAlertId, setViewedAlertId] = useState(null);
  const [submittingAlertId, setSubmittingAlertId] = useState(null);
  const [readStatus, setReadStatus] = useState(null);
  const [readResult, setReadResult] = useState(null);
  const [readError, setReadError] = useState(null);
  const detailBodyRef = useRef(null);
  const { user, isAuthenticated } = useAuthStore();
  const alertId = alert?.id;
  const userAlertKey = user?.id && alertId ? `${user.id}:${alertId}` : null;

  const styles = alert ? getSeverityOutline(alert.severity) : null;
  const alertStatus = String(alert?.status || "Unknown");
  const normalizedStatus = alertStatus.toLowerCase();
  const statusClass = normalizedStatus === "resolved"
    ? "bg-green-100 text-green-600"
    : normalizedStatus === "expired"
      ? "bg-yellow-100 text-yellow-800"
      : normalizedStatus === "active"
        ? "bg-blue-100 text-blue-700"
        : "bg-zinc-100 text-zinc-700";

  useEffect(() => {
    if (!alert || !mapReady) return;
  }, [alert, mapReady, mapCenter]);

  useEffect(() => {
    if (!alert) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [alert]);

  useEffect(() => {
    if (!alert) {
      setMapReady(false);
      return;
    }

    setMapReady(false);
    let cancelled = false;

    (async () => {
      if (alert.latitude != null && alert.longitude != null) {
        if (!cancelled) {
          const center = [Number(alert.latitude), Number(alert.longitude)];
          setMapCenter(center);
          setMapReady(true);
        }
        return;
      }

      const coords = await geocodeLocation(alert.location);
      if (!cancelled) {
        setMapCenter(coords || DAET_CENTER);
        setMapReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [alert]);

  useEffect(() => {
    if (!alertId) return undefined;
    const frame = requestAnimationFrame(() => {
      const body = detailBodyRef.current;
      if (body && body.scrollHeight <= body.clientHeight + 4) {
        setViewedAlertId(alertId);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [alertId]);

  useEffect(() => {
    if (!userAlertKey || !isAuthenticated || user?.role !== "tourist") {
      return undefined;
    }

    let cancelled = false;
    setReadStatus({ key: userAlertKey, status: "checking" });

    (async () => {
      try {
        const { data, error } = await supabase
          .from("point_transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("crisis_alert_id", alertId)
          .eq("transaction_type", "earned")
          .eq("reason", "alert_read")
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          console.error("[Rewards] Could not check advisory read status:", error.message);
          setReadStatus({ key: userAlertKey, status: "unknown" });
          return;
        }

        setReadStatus({ key: userAlertKey, status: data ? "read" : "unread" });
      } catch (error) {
        if (cancelled) return;
        console.error("[Rewards] Could not check advisory read status:", error.message);
        setReadStatus({ key: userAlertKey, status: "unknown" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [alertId, isAuthenticated, user?.id, user?.role, userAlertKey]);

  if (!alert || !styles) return null;

  const emergencyLanguage =
    /(emergency|evacuat|warning|911|117|assistance|assist|urgent|immediate danger|rescue|shelter|call police|call the police|call fire|call ambulance)/i;
  const canOfferReadPoints =
    isAuthenticated &&
    user?.role === "tourist" &&
    alert.rewards_eligible === true &&
    alert.is_public !== false &&
    String(alert.status || "").toLowerCase() === "active" &&
    ["low", "medium"].includes(String(alert.severity || "").toLowerCase()) &&
    ["general", "weather", "health"].includes(String(alert.type || "").toLowerCase()) &&
    !emergencyLanguage.test(`${alert.title || ""} ${alert.message || ""} ${alert.type || ""}`);
  const hasViewedContent = viewedAlertId === alert.id;
  const hasAlreadyRead = readStatus?.key === userAlertKey && readStatus.status === "read";
  const canShowReadState = canOfferReadPoints || hasAlreadyRead;
  const isCheckingReadStatus =
    canOfferReadPoints &&
    (readStatus?.key !== userAlertKey || readStatus.status === "checking");
  const resultForThisAlert = readResult?.key === userAlertKey ? readResult.result : null;
  const errorForThisAlert = readError?.key === userAlertKey ? readError.message : null;

  const handleDetailScroll = () => {
    const body = detailBodyRef.current;
    if (body && body.scrollTop + body.clientHeight >= body.scrollHeight - 8) {
      setViewedAlertId(alert.id);
    }
  };

  const handleReadAdvisory = async () => {
    if (!hasViewedContent || !canOfferReadPoints || hasAlreadyRead || submittingAlertId) return;
    setSubmittingAlertId(alert.id);
    setReadError(null);
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Sign in again to record this advisory.");

      const response = await fetch("/api/rewards/alerts/read", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alertId: alert.id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Could not record this advisory as read.");
      }
      setReadResult({ key: userAlertKey, result: payload.result });
      if (["awarded", "already_awarded"].includes(payload.result?.status)) {
        setReadStatus({ key: userAlertKey, status: "read" });
      }
      if (payload.result?.status === "awarded") {
        notifyRewardEarned(payload.result.points, `alert-read:${userAlertKey}`);
      }
    } catch (error) {
      setReadError({ key: userAlertKey, message: error.message });
    } finally {
      setSubmittingAlertId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-detail-title"
    >
      <div
        className="relative z-[2001] max-w-2xl w-full max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
      <Card
        className={`p-0 max-h-[90vh] overflow-hidden border-2 ${styles.border} shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col`}
      >
        <div className={`${styles.headerBg} ${styles.headerFg} p-6 sm:p-8 text-left shrink-0 rounded-t-2xl`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${styles.headerIcon}`}>
              <AlertTypeIcon type={alert.type} size={iconSize.empty} />
            </div>
            <button type="button" onClick={onClose} className={styles.headerFg} aria-label="Close">
              <X />
            </button>
          </div>
          <h2 id="alert-detail-title" className={`text-xl sm:text-[26px] font-black uppercase tracking-tighter leading-tight ${styles.headerFg} mb-3`}>
            {alert.title}
          </h2>
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
            <span className={`px-2 py-1 rounded ${styles.headerBadge}`}>{alert.severity}</span>
            <span className={`px-2 py-1 rounded ${styles.headerBadge}`}>{alert.type}</span>
            <span className={`px-2 py-1 rounded ${styles.headerBadge}`}>{alert.location}</span>
          </div>
        </div>

        <div
          ref={detailBodyRef}
          onScroll={handleDetailScroll}
          className="p-6 sm:p-8 space-y-5 bg-white text-left overflow-y-auto flex-1"
        >
          <p className="text-sm font-medium leading-relaxed text-zinc-700">{alert.message}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Reported</p>
              <p className="font-bold text-zinc-900">{new Date(alert.created_at).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Status</p>
              <p className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase ${statusClass}`}>
                {alertStatus}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-1.5">
              <MapPin size={iconSize.inlineSm} className={styles.titleStatic} /> Affected area on map
            </p>
            {mapReady ? (
              <CrisisHubMap
                alerts={[alert]}
                warnings={[]}
                showWarnings={false}
                showTouristSpots={false}
                showSafeRoutePins={false}
                showRoutePaths={false}
                showLegend={false}
                center={mapCenter}
                zoom={14}
                heightClass="h-[220px] sm:h-[260px]"
                mapKey={`alert-modal-${alert.id}`}
              />
            ) : (
              <div className="h-[220px] sm:h-[260px] rounded-3xl border border-zinc-200 bg-zinc-100 animate-pulse flex items-center justify-center">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Loading map…</p>
              </div>
            )}
            <p className="text-[10px] text-zinc-400 font-medium">
              Pin shows the reported affected area for this alert. Follow tourism office instructions on the ground.
            </p>
          </div>

          <div className={`p-5 rounded-2xl border flex items-start gap-4 ${styles.ctaBg}`}>
            <CardIconBox boxClass={styles.icon}>
              <AlertSeverityIcon severity={alert.severity} size={iconSize.auth} />
            </CardIconBox>
            <div>
              <p className={`text-xs font-black uppercase tracking-widest mb-1 ${styles.ctaLabel}`}>Recommended Actions</p>
              <p className={`text-sm font-medium leading-relaxed ${styles.ctaBody}`}>
                Follow the instructions above. Avoid the affected area ({alert.location}) until this alert is marked Resolved. For immediate danger, call 911 or 117.
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 bg-white rounded-b-2xl border-t border-zinc-100 p-4">
          {canShowReadState && (
            <div className="mb-3">
              {hasAlreadyRead ? (
                <>
                  <button
                    type="button"
                    disabled
                    className="mb-3 w-full rounded-2xl border border-emerald-200 bg-emerald-50 py-3 text-emerald-700 font-black uppercase text-[10px] tracking-widest disabled:opacity-100"
                  >
                    Already Read ✓
                  </button>
                  {resultForThisAlert?.status === "awarded" ? (
                    <p className="flex items-center justify-center gap-2 text-sm font-bold text-green-700" role="status">
                      <CheckCircle2 size={16} />
                      {resultForThisAlert.points} points added to your balance.
                    </p>
                  ) : (
                    <p className="text-center text-xs font-medium text-zinc-500" role="status">
                      You have already earned points for this advisory.
                    </p>
                  )}
                </>
              ) : ["rewards_disabled", "activity_disabled", "not_eligible"].includes(resultForThisAlert?.status) ? (
                <p className="text-center text-xs font-medium text-zinc-500" role="status">
                  {resultForThisAlert.status === "rewards_disabled"
                    ? "The Rewards Program is currently turned off."
                    : resultForThisAlert.status === "activity_disabled"
                      ? "Alert reading points are currently turned off."
                      : "This advisory is not eligible for points."}
                </p>
              ) : (
                <>
                  {errorForThisAlert && (
                    <p className="mb-2 text-center text-xs font-medium text-red-600" role="alert">
                      {errorForThisAlert}
                    </p>
                  )}
                  {readStatus?.key === userAlertKey && readStatus.status === "unknown" && (
                    <p className="mb-2 text-center text-[10px] font-medium text-amber-700" role="status">
                      Could not check whether you have read this advisory. The server will still prevent duplicate awards.
                    </p>
                  )}
                  {hasViewedContent && !isCheckingReadStatus ? (
                    <button
                      type="button"
                      onClick={handleReadAdvisory}
                      disabled={submittingAlertId === alert.id}
                      className="mb-3 w-full rounded-2xl border border-blue-200 bg-blue-50 py-3 text-blue-700 font-black uppercase text-[10px] tracking-widest hover:bg-blue-100 disabled:opacity-50"
                    >
                      {submittingAlertId === alert.id ? (
                        <><Loader2 size={14} className="inline animate-spin mr-2" />Recording...</>
                      ) : (
                        "I have read this advisory"
                      )}
                    </button>
                  ) : (
                    <p className="mb-3 text-center text-[10px] font-bold text-zinc-500">
                      {isCheckingReadStatus
                        ? "Checking whether you have already read this advisory..."
                        : "Read through the advisory above to unlock this optional action."}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest"
          >
            Acknowledge & Close
          </button>
        </div>
      </Card>
      </div>
    </div>
  );
}
