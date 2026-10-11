import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, Check, Clock } from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { getPriorityOutline, iconSize, outlinedCard, typography } from "@/lib/designSystem";
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
}) {
  const styles = getPriorityOutline(notification.priority);
  const isUnread = !notification.is_read;
  const useRow = compact || variant === "row";
  const listVariant = variant === "list";
  const priorityBadge = {
    CRITICAL: "bg-red-100 text-red-700",
    HIGH: "bg-orange-100 text-orange-700",
    NORMAL: "bg-blue-100 text-blue-700",
    LOW: "bg-zinc-100 text-zinc-600",
  };
  const badgeClass = priorityBadge[notification.priority] || priorityBadge.NORMAL;
  const arrowTone = {
    CRITICAL: "text-red-700",
    HIGH: "text-orange-700",
    NORMAL: "text-blue-700",
    LOW: "text-zinc-600",
  };
  const arrowClass = arrowTone[notification.priority] || arrowTone.NORMAL;

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
      className={`flex items-start gap-2 px-2.5 py-2 ${isUnread ? "bg-blue-50/70" : "bg-white"} ${relatedLink ? "cursor-pointer hover:bg-zinc-50" : ""}`}
    >
      <span
        className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${isUnread ? "bg-blue-600" : "bg-zinc-300"}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold leading-snug text-zinc-800 line-clamp-2">{notification.title}</p>
        {notification.message ? (
          <p className="mt-0.5 text-[10px] leading-snug text-zinc-500 line-clamp-1">{notification.message}</p>
        ) : null}
        <p className="mt-0.5 text-[9px] text-zinc-400">{formatWhen(notification.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {markReadControl}
        {relatedLink ? <ArrowRight size={12} className="text-zinc-300" /> : null}
      </div>
    </div>
  ) : listVariant ? (
    <OutlinedCard
      variant="priority"
      priority={notification.priority}
      interactive={Boolean(relatedLink)}
      padding={outlinedCard.alertPadding}
      className={`border-2 ${styles.border} ${isUnread ? styles.unreadBg : ""} ${relatedLink ? "cursor-pointer" : ""} text-left`}
    >
      <div className="flex items-start justify-between gap-3">
        <CardIconBox boxClass={styles.icon}>
          {notification.priority === "CRITICAL" ? (
            <AlertTriangle size={iconSize.stat} strokeWidth={2.25} />
          ) : (
            <Bell size={iconSize.stat} strokeWidth={2.25} />
          )}
        </CardIconBox>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${badgeClass}`}>
              {notification.priority}
            </span>
            {isUnread ? (
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-blue-100 text-blue-700">Unread</span>
            ) : null}
          </div>
          <h3 className={`${typography.cardTitleBase} ${styles.title}`}>{notification.title}</h3>
          <p className="text-[10px] text-zinc-400 font-bold uppercase mt-2 flex items-center gap-1">
            <Clock size={iconSize.inlineSm} />
            {formatWhen(notification.created_at)}
          </p>
          {markReadControl ? <div className="mt-2">{markReadControl}</div> : null}
        </div>
        {relatedLink ? <ArrowRight size={16} className={`text-zinc-300 shrink-0 mt-1 ${arrowClass}`} /> : null}
      </div>
    </OutlinedCard>
  ) : (
    <OutlinedCard
      variant="priority"
      priority={notification.priority}
      compact={compact}
      interactive={Boolean(relatedLink)}
      padding={outlinedCard.notificationPadding}
      className={`${isUnread ? styles.unreadBg : ""} ${relatedLink ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start gap-3">
        <CardIconBox boxClass={styles.icon} size="md">
          {notification.priority === "CRITICAL" ? (
            <AlertTriangle size={16} strokeWidth={2.25} />
          ) : (
            <Bell size={16} strokeWidth={2.25} />
          )}
        </CardIconBox>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`${typography.cardTitleBase} text-sm ${styles.title}`}>{notification.title}</h3>
            <span className="text-[9px] font-black uppercase text-zinc-400 shrink-0">{notification.priority}</span>
          </div>
          <p className="text-zinc-600 mt-1 text-sm">{notification.message}</p>
          <p className="text-zinc-400 font-bold uppercase mt-2 text-[10px]">{formatWhen(notification.created_at)}</p>
          {markReadControl ? <div className="flex items-center gap-2 mt-2">{markReadControl}</div> : null}
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
