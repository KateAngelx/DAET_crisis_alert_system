import React from "react";
import Link from "next/link";
import { AlertTriangle, Bell, Check } from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { getPriorityOutline, outlinedCard } from "@/lib/designSystem";

export function NotificationItemCard({
  notification,
  compact = false,
  relatedLink = null,
  onMarkRead,
  onNavigate,
}) {
  const styles = getPriorityOutline(notification.priority);
  const isUnread = !notification.is_read;

  const card = (
    <OutlinedCard
      variant="priority"
      priority={notification.priority}
      compact={compact}
      padding={compact ? "p-4" : outlinedCard.notificationPadding}
      className={`${isUnread ? styles.unreadBg : ""} ${relatedLink ? "hover:-translate-y-0.5 hover:shadow-2xl cursor-pointer" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-2xl shrink-0 ${styles.icon}`}>
          {notification.priority === "CRITICAL" ? <AlertTriangle size={compact ? 14 : 16} /> : <Bell size={compact ? 14 : 16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-bold text-zinc-900 ${compact ? "text-xs truncate" : "text-sm"}`}>
              {notification.title}
            </h3>
            {!compact && (
              <span className="text-[9px] font-black uppercase text-zinc-400 shrink-0">
                {notification.priority}
              </span>
            )}
          </div>
          <p className={`text-zinc-600 mt-1 ${compact ? "text-[11px] line-clamp-2" : "text-sm"}`}>
            {notification.message}
          </p>
          <p className={`text-zinc-400 font-bold uppercase mt-2 ${compact ? "text-[9px]" : "text-[10px]"}`}>
            {new Date(notification.created_at).toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {isUnread && onMarkRead && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onMarkRead(notification.id);
                }}
                className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1"
              >
                <Check size={compact ? 10 : 12} /> Mark read
              </button>
            )}
          </div>
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
