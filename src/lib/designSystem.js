/**
 * Shared typography and icon scale for Public, Admin, Guide, and Tourist interfaces.
 * Use semantic tokens — do not introduce one-off font sizes in pages.
 */

/** @type {Record<string, string>} */
export const typography = {
  /** CONNECT-DAET brand in headers — 18px */
  brand: "text-lg font-black uppercase tracking-tighter leading-none",
  /** Page / dashboard titles — 20px mobile, 22px desktop */
  pageTitle: "text-xl md:text-[22px] font-black uppercase tracking-tight text-zinc-900 leading-tight",
  /** Hero, modal, auth primary headings — 26px */
  heroTitle: "text-[26px] font-black uppercase tracking-tighter text-zinc-900 leading-tight",
  /** Card and alert titles — 18px */
  cardTitle: "text-lg font-black tracking-tight uppercase leading-snug text-zinc-900",
  /** Large public stat values — 32px */
  statValueLg: "text-[32px] font-black leading-none",
  /** Dashboard / panel stat values — responsive compact */
  statValue: "text-xl sm:text-2xl lg:text-[28px] font-black leading-none",
  /** Stat card labels, eyebrows, micro CTAs — 10px */
  statLabel: "text-[10px] font-black uppercase tracking-widest",
  /** Section headings (e.g. ACTIVE TOURISTS) — 12px */
  sectionTitle: "text-xs font-black uppercase tracking-widest text-zinc-400",
  /** Page descriptions — 14px */
  description: "text-sm text-zinc-500 font-medium leading-relaxed",
  /** Body copy — 14px */
  body: "text-sm font-medium leading-relaxed",
  /** Secondary body — 12px */
  bodySm: "text-xs font-medium",
  /** Buttons / nav links — 10px uppercase */
  button: "text-[10px] font-black uppercase tracking-widest",
  /** Tiny badges — 9px */
  badge: "text-[9px] font-black uppercase",
};

/** Lucide icon sizes (px) — proportional to accompanying typography */
export const iconSize = {
  /** Brand mark in headers */
  brand: 18,
  /** Primary navigation icons */
  nav: 18,
  /** Stat card icons */
  stat: 18,
  /** Section header icons */
  section: 16,
  /** Inline with body / metadata */
  inline: 14,
  /** Inline with micro labels */
  inlineSm: 12,
  /** Buttons and CTAs */
  button: 16,
  /** Empty states */
  empty: 32,
  /** Auth form hero icon */
  auth: 24,
  /** Large decorative empty states */
  emptyLg: 40,
};

/** Responsive stat card grid layouts — mobile-first (Crisis Hub style) */
export const statGrid = {
  /** 4 stats: 2×2 on mobile, row of 4 on large screens */
  dashboard: "grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 min-w-0",
  /** 3 stats: 3 columns on mobile (matches Crisis Hub) */
  dashboardThree: "grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 min-w-0",
  /** 5 stats: 2 cols mobile, 3 tablet, 5 desktop */
  dashboardFive: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 min-w-0",
  public: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6",
  /** Crisis Hub — three stats in one row on mobile */
  crisisHub: "grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 min-w-0",
};

/** Shared outlined card shell — matches ServiceCard reference styling */
export const outlinedCard = {
  base: "bg-white shadow-xl border transition-all min-w-0",
  radius: "rounded-[40px]",
  radiusCompact: "rounded-3xl",
  statPadding: "p-3 sm:p-4 lg:p-5",
  statPaddingCompact: "p-2.5 sm:p-3 lg:p-4",
  alertPadding: "p-6",
  notificationPadding: "p-5 sm:p-6",
};

/** Semantic outline + content colors for stat cards */
export const statCardAccent = {
  blue: {
    border: "border-blue-600",
    icon: "bg-blue-600 text-white",
    value: "text-blue-600",
    label: "text-zinc-400",
    footer: "text-blue-600",
    dot: "bg-blue-600",
  },
  red: {
    border: "border-red-600",
    icon: "bg-red-600 text-white",
    value: "text-red-600",
    label: "text-zinc-400",
    footer: "text-red-600",
    dot: "bg-red-600",
  },
  orange: {
    border: "border-orange-500",
    icon: "bg-orange-500 text-white",
    value: "text-orange-600",
    label: "text-zinc-400",
    footer: "text-orange-600",
    dot: "bg-orange-500",
  },
  green: {
    border: "border-green-600",
    icon: "bg-green-600 text-white",
    value: "text-green-600",
    label: "text-zinc-400",
    footer: "text-green-600",
    dot: "bg-green-600",
  },
  purple: {
    border: "border-purple-600",
    icon: "bg-purple-600 text-white",
    value: "text-purple-600",
    label: "text-zinc-400",
    footer: "text-purple-600",
    dot: "bg-purple-600",
  },
  zinc: {
    border: "border-zinc-400",
    icon: "bg-zinc-600 text-white",
    value: "text-zinc-900",
    label: "text-zinc-400",
    footer: "text-zinc-600",
    dot: "bg-zinc-600",
  },
  yellow: {
    border: "border-yellow-500",
    icon: "bg-yellow-500 text-white",
    value: "text-yellow-700",
    label: "text-zinc-400",
    footer: "text-yellow-700",
    dot: "bg-yellow-500",
  },
};

export const severityOutline = {
  Critical: {
    border: "border-red-600",
    badge: "bg-red-100 text-red-700",
    icon: "bg-red-600 text-white",
  },
  High: {
    border: "border-orange-500",
    badge: "bg-orange-100 text-orange-700",
    icon: "bg-orange-500 text-white",
  },
  Medium: {
    border: "border-yellow-500",
    badge: "bg-yellow-100 text-yellow-700",
    icon: "bg-yellow-500 text-white",
  },
  Low: {
    border: "border-blue-600",
    badge: "bg-blue-100 text-blue-700",
    icon: "bg-blue-600 text-white",
  },
};

export const priorityOutline = {
  CRITICAL: {
    border: "border-red-600",
    icon: "bg-red-600 text-white",
    unreadBg: "bg-red-50/40",
  },
  HIGH: {
    border: "border-orange-500",
    icon: "bg-orange-500 text-white",
    unreadBg: "bg-orange-50/40",
  },
  NORMAL: {
    border: "border-blue-600",
    icon: "bg-blue-600 text-white",
    unreadBg: "bg-blue-50/40",
  },
  LOW: {
    border: "border-zinc-400",
    icon: "bg-zinc-500 text-white",
    unreadBg: "bg-zinc-50",
  },
};

export function getStatCardAccent(accent = "blue") {
  return statCardAccent[accent] || statCardAccent.blue;
}

export function getSeverityOutline(severity) {
  return severityOutline[severity] || severityOutline.Low;
}

export function getPriorityOutline(priority) {
  return priorityOutline[priority] || priorityOutline.NORMAL;
}

/** Stat card shell classes */
export const statCard = {
  shell: "p-3 sm:p-4 lg:p-5 text-left min-w-0",
  compact: "p-2.5 sm:p-3 lg:p-4 text-left min-w-0",
  dashboard: "p-3 sm:p-4 lg:p-5 text-left min-w-0",
  public: "p-3 sm:p-4 lg:p-5 text-left min-w-0",
  iconWrap: "p-2 sm:p-2.5 lg:p-3 rounded-xl sm:rounded-2xl shrink-0 [&_svg]:size-4 sm:[&_svg]:size-[18px]",
  iconRow: "flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3 lg:mb-4",
  label: "text-[9px] sm:text-[10px] font-black uppercase tracking-wide sm:tracking-widest leading-tight line-clamp-2",
};

/** Auth login / register — fixed viewport card, no page scroll */
export const authForm = {
  card: "w-full max-w-md max-h-[calc(100dvh-5.5rem)] overflow-hidden p-5 sm:p-6 border-none shadow-2xl bg-white rounded-[28px]",
  cardWide: "w-full max-w-lg max-h-[calc(100dvh-5.5rem)] overflow-hidden p-5 sm:p-6 border-none shadow-2xl bg-white rounded-[28px]",
  header: "text-center mb-4",
  iconWrap: "bg-blue-600 size-11 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-200",
  input: "w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 disabled:opacity-50",
  label: "text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1",
  fieldGap: "space-y-1",
  formGap: "space-y-3",
  submitBtn:
    "w-full py-3.5 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:bg-blue-400",
  footer: "mt-4 pt-4 border-t border-zinc-50 text-center",
};

