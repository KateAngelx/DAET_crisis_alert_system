import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, EyeOff, RotateCcw } from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { getPriorityOutline, getSeverityOutline, iconSize, outlinedCard, typography } from "@/lib/designSystem";
import { canDismissNotification, getNotificationSeverity, isDismissedNotification } from "@/lib/notificationCategory";
import { NotificationTypeIcon } from "@/app/components/ui/cardTypeIcons";

/** Resolved / cleared notices use the Success green. */
const RESOLVED_STYLES = {
  border: "border-green-500",
  badge: "bg-green-100 text-green-700",
  icon: "border-green-200 bg-green-50 text-green-700",
  title: "text-zinc-900 group-hover:text-green-700 group-active:text-green-700 transition-colors",
  titleStatic: "text-green-700",
  unreadBg: "bg-green-50/40",
};

/** Light background for unread cards, matching the severity color. */
const SEVERITY_UNREAD_BG = {
  Critical: "bg-red-50/50",
  High: "bg-orange-50/50",
  Medium: "bg-yellow-50/60",
  Low: "bg-blue-50/40",
};
import { CardIconBox } from "@/app/components/ui/CardIconBox";

function formatWhen(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationItemCard({
  notification,
  compact = false,
  variant = "default",
  relatedLink = null,
  onMarkRead,
  onNavigate,
  onDismiss,
}) {
  const [dismissError, setDismissError] = useState("");
  // Alert, hazard and road notices take the same color as their severity cards;
  // routine notices keep the priority colors.
  const severity = getNotificationSeverity(notification);
  const levelStyles =
    severity === "Resolved"
      ? RESOLVED_STYLES
      : severity
        ? { ...getSeverityOutline(severity), unreadBg: SEVERITY_UNREAD_BG[severity] }
        : null;
  const styles = levelStyles || getPriorityOutline(notification.priority);
  const levelLabel = severity || notification.priority;
  const isAlertLevel = Boolean(severity) && severity !== "Resolved";
  const cardVariantProps = isAlertLevel
    ? { variant: "severity", severity }
    : severity === "Resolved"
      ? { variant: "accent", accent: "green" }
      : { variant: "priority", priority: notification.priority };
  const isUnread = !notification.is_read;
  const useRow = compact || variant === "row";
  const listVariant = variant === "list";
  const priorityBadge = {
    CRITICAL: "bg-red-100 text-red-700",
    HIGH: "bg-orange-100 text-orange-700",
    NORMAL: "bg-blue-100 text-blue-700",
    LOW: "bg-zinc-100 text-zinc-600",
  };
  const badgeClass = levelStyles
    ? levelStyles.badge
    : priorityBadge[notification.priority] || priorityBadge.NORMAL;
  const arrowTone = {
    CRITICAL: "text-red-700",
    HIGH: "text-orange-700",
    NORMAL: "text-blue-700",
    LOW: "text-zinc-600",
  };
  const arrowClass = levelStyles
    ? levelStyles.titleStatic
    : arrowTone[notification.priority] || arrowTone.NORMAL;
  // One icon per type (weather, flood, road, resolved, reward …); the color still shows severity.

  const dismissed = isDismissedNotification(notification);
  const runDismiss = async (event, value) => {
    event.preventDefault();
    event.stopPropagation();
    setDismissError("");
    const result = await onDismiss(notification.id, value);
    if (result && !result.success) setDismissError(result.error);
  };
  const dismissControl = onDismiss && (dismissed || canDismissNotification(notification)) ? (
    <button
      type="button"
      onClick={(event) => runDismiss(event, !dismissed)}
      className={`font-black text-zinc-500 uppercase flex items-center gap-1 hover:text-zinc-800 ${useRow ? "text-[8px]" : "text-[9px]"}`}
      aria-label={dismissed ? "Show this notification again" : "Not affected — dismiss this notification"}
      title={dismissed ? "Show again" : "Not affected — dismiss"}
    >
      {dismissed ? <RotateCcw size={useRow ? 10 : 12} /> : <EyeOff size={useRow ? 10 : 12} />}
      {dismissed ? "Show again" : useRow ? "Not affected" : "Not affected — dismiss"}
    </button>
  ) : null;
  const dismissErrorText = dismissError ? (
    <span role="alert" className="text-[9px] font-bold text-red-600">{dismissError}</span>
  ) : null;

  const markReadControl =
    isUnread && onMarkRead ? (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onMarkRead(notification.id);
        }}
        className={`font-black text-blue-600 uppercase flex items-center gap-1 ${useRow ? "text-[8px]" : "text-[9px]"}`}
        aria-label="Mark read"
      >
        <Check size={useRow ? 10 : 12} />
        {useRow ? "Read" : "Mark read"}
      </button>
    ) : null;

  const card = useRow ? (
    <div
      className={`flex items-start gap-2 border-l-4 px-2.5 py-2 ${levelStyles ? levelStyles.border : "border-transparent"} ${isUnread ? (levelStyles ? levelStyles.unreadBg : "bg-blue-50/70") : "bg-white"} ${relatedLink ? "cursor-pointer hover:bg-zinc-50" : ""}`}
    >
      {/* Type icon (weather, flood, road, message …) in the severity color; the dot marks unread. */}
      <span className="relative mt-0.5 shrink-0" aria-hidden="true">
        <NotificationTypeIcon notification={notification} size={14} className={levelStyles ? arrowClass : "text-zinc-500"} />
        {isUnread ? <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-blue-600 ring-1 ring-white" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        {severity ? (
          <span className={`mb-0.5 inline-block rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${badgeClass}`}>
            {levelLabel}
          </span>
        ) : null}
        <p className="text-[11px] font-semibold leading-snug text-zinc-800 line-clamp-2">{notification.title}</p>
        {notification.message ? (
          <p className="mt-0.5 text-[10px] leading-snug text-zinc-500 line-clamp-1">{notification.message}</p>
        ) : null}
        <p className="mt-0.5 text-[9px] text-zinc-400">{formatWhen(notification.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {markReadControl}
        {dismissControl}
        {dismissErrorText}
        {relatedLink ? <ArrowRight size={12} className={levelStyles ? arrowClass : "text-zinc-300"} /> : null}
      </div>
    </div>
  ) : listVariant ? (
    <OutlinedCard
      {...cardVariantProps}
      interactive={Boolean(relatedLink)}
      padding={outlinedCard.alertPadding}
      className={`border-2 ${styles.border} ${isUnread ? styles.unreadBg : ""} ${relatedLink ? "cursor-pointer" : ""} text-left`}
    >
      <div className="flex items-start justify-between gap-3">
        <CardIconBox boxClass={styles.icon}>
          <NotificationTypeIcon notification={notification} size={iconSize.stat} />
        </CardIconBox>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${badgeClass}`}>
              {levelLabel}
            </span>
            {isUnread ? (
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-blue-100 text-blue-700">Unread</span>
            ) : null}
          </div>
          <h3 className={`${typography.cardTitleBase} ${styles.title}`}>{notification.title}</h3>
          {notification.message ? (
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{notification.message}</p>
          ) : null}
          <p className="text-[10px] text-zinc-400 font-bold uppercase mt-2 flex items-center gap-1">
            <Clock size={iconSize.inlineSm} />
            {formatWhen(notification.created_at)}
          </p>
          {markReadControl || dismissControl ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">{markReadControl}{dismissControl}{dismissErrorText}</div>
          ) : null}
        </div>
        {relatedLink ? <ArrowRight size={16} className={`text-zinc-300 shrink-0 mt-1 ${arrowClass}`} /> : null}
      </div>
    </OutlinedCard>
  ) : (
    <OutlinedCard
      {...cardVariantProps}
      compact={compact}
      interactive={Boolean(relatedLink)}
      padding={outlinedCard.notificationPadding}
      className={`${isUnread ? styles.unreadBg : ""} ${relatedLink ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start gap-3">
        <CardIconBox boxClass={styles.icon} size="md">
          <NotificationTypeIcon notification={notification} size={16} />
        </CardIconBox>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`${typography.cardTitleBase} text-sm ${styles.title}`}>{notification.title}</h3>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${levelStyles ? badgeClass : "text-zinc-400"}`}>{levelLabel}</span>
          </div>
          <p className="text-zinc-600 mt-1 text-sm">{notification.message}</p>
          <p className="text-zinc-400 font-bold uppercase mt-2 text-[10px]">{formatWhen(notification.created_at)}</p>
          {markReadControl || dismissControl ? (
            <div className="flex flex-wrap items-center gap-3 mt-2">{markReadControl}{dismissControl}{dismissErrorText}</div>
          ) : null}
        </div>
      </div>
    </OutlinedCard>
  );

  if (relatedLink) {
    return (
      <Link
        href={relatedLink}
        className="block no-underline"
        onClick={() => {
          onMarkRead?.(notification.id);
          onNavigate?.();
        }}
      >
        {card}
      </Link>
    );
  }

  return card;
}
