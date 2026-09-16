import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, Check, Clock } from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { getPriorityOutline, iconSize, outlinedCard, typography } from "@/lib/designSystem";
import { CardIconBox } from "@/app/components/ui/CardIconBox";

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
  const listVariant = variant === "list" || compact;
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
        className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1"
      >
        <Check size={listVariant ? 10 : 12} /> Mark read
      </button>
    ) : null;

  const card = listVariant ? (
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
            {new Date(notification.created_at).toLocaleString()}
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
          <p className="text-zinc-400 font-bold uppercase mt-2 text-[10px]">
            {new Date(notification.created_at).toLocaleString()}
          </p>
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
