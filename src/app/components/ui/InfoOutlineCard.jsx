import React from "react";
import Link from "next/link";
import { cardGroupTouchShadow, getInfoCardAccent, typography } from "@/lib/designSystem";

function renderCardIcon(Icon, iconSize) {
  if (!Icon) return null;
  if (React.isValidElement(Icon)) return Icon;
  return React.createElement(Icon, { size: iconSize, strokeWidth: 2.25 });
}

export function InfoOutlineCard({
  icon: Icon,
  label,
  description,
  accent = "blue",
  href,
  footer,
  className = "",
  iconSize = 18,
  children,
}) {
  const styles = getInfoCardAccent(accent);
  const interactiveShadow = href ? cardGroupTouchShadow : "";

  const card = (
    <article
      className={`flex flex-col h-full rounded-xl border bg-white p-4 sm:p-5 ${interactiveShadow} ${styles.border} ${className}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${styles.iconBox}`}
        >
          {renderCardIcon(Icon, iconSize)}
        </div>
        {label ? (
          <h3 className={`${typography.cardTitleBase} text-[11px] sm:text-xs tracking-wide ${href ? styles.label : styles.labelStatic}`}>
            {label}
          </h3>
        ) : null}
      </div>
      {description ? (
        <p className="text-xs sm:text-sm text-zinc-500 font-medium leading-relaxed flex-1">{description}</p>
      ) : null}
      {children}
      {footer ? <div className="mt-4 pt-3 border-t border-zinc-100">{footer}</div> : null}
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline min-w-0 h-full group">
        {card}
      </Link>
    );
  }

  return card;
}
