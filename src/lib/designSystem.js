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
  /** Card titles without color — pair with accent title tokens on interactive cards */
  cardTitleBase: "text-lg font-black tracking-tight uppercase leading-snug",
  /** Large public stat values — 32px */
  statValueLg: "text-[32px] font-black leading-none",
  /** Dashboard / panel stat values — responsive compact */
  statValue: "text-xl sm:text-2xl lg:text-[28px] font-bold leading-none",
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
  /** 3 stats: stack on narrow phones, row from sm */
  dashboardThree: "grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 min-w-0",
  /** 5 stats: 2 cols mobile, 3 tablet, 5 desktop */
  dashboardFive: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 min-w-0",
  public: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6",
  /** Crisis Hub — stack on narrow viewports, three columns from sm */
  crisisHub: "grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 min-w-0",
  /** Incident reports — one horizontal row (scroll on narrow, 7 equal columns on xl) */
  incidentStatsRow:
    "grid grid-flow-col auto-cols-[minmax(8rem,1fr)] grid-rows-1 gap-2 sm:gap-3 overflow-x-auto pb-1 min-w-0 xl:grid-flow-row xl:grid-cols-7 xl:auto-cols-auto xl:overflow-x-visible",
};

/** Shadow only on hover / touch for interactive cards */
export const cardTouchShadow = "shadow-none hover:shadow-md active:shadow-md transition-shadow";
export const cardGroupTouchShadow = "shadow-none group-hover:shadow-md group-active:shadow-md transition-shadow";

/** Shared outlined card shell — colored border outlines */
export const outlinedCard = {
  base: "bg-white border shadow-none min-w-0",
  radius: "rounded-xl",
  radiusCompact: "rounded-xl",
  statPadding: "p-3 sm:p-4 lg:p-5",
  statPaddingCompact: "p-2.5 sm:p-3 lg:p-4",
  alertPadding: "p-5 sm:p-6",
  notificationPadding: "p-4 sm:p-5",
};

/** Outline info cards — communication channels, services, feature tiles */
export const infoCardAccent = {
  blue: {
    border: "border-blue-600",
    iconBox: "border-blue-200 bg-blue-50 text-blue-700",
    label: "text-zinc-900 group-hover:text-blue-700 group-active:text-blue-700 transition-colors",
    labelStatic: "text-blue-700",
    activeBg: "bg-blue-50/80",
  },
  red: {
    border: "border-red-600",
    iconBox: "border-red-200 bg-red-50 text-red-700",
    label: "text-zinc-900 group-hover:text-red-700 group-active:text-red-700 transition-colors",
    labelStatic: "text-red-700",
    activeBg: "bg-red-50/80",
  },
  orange: {
    border: "border-orange-500",
    iconBox: "border-orange-200 bg-orange-50 text-orange-700",
    label: "text-zinc-900 group-hover:text-orange-700 group-active:text-orange-700 transition-colors",
    labelStatic: "text-orange-700",
    activeBg: "bg-orange-50/80",
  },
  green: {
    border: "border-green-600",
    iconBox: "border-green-200 bg-green-50 text-green-700",
    label: "text-zinc-900 group-hover:text-green-700 group-active:text-green-700 transition-colors",
    labelStatic: "text-green-700",
    activeBg: "bg-green-50/80",
  },
  purple: {
    border: "border-purple-600",
    iconBox: "border-purple-200 bg-purple-50 text-purple-700",
    label: "text-zinc-900 group-hover:text-purple-700 group-active:text-purple-700 transition-colors",
    labelStatic: "text-purple-700",
    activeBg: "bg-purple-50/80",
  },
  zinc: {
    border: "border-zinc-300",
    iconBox: "border-zinc-200 bg-zinc-50 text-zinc-500",
    label: "text-zinc-900 group-hover:text-zinc-600 group-active:text-zinc-600 transition-colors",
    labelStatic: "text-zinc-600",
    activeBg: "bg-zinc-50",
  },
  yellow: {
    border: "border-yellow-500",
    iconBox: "border-yellow-200 bg-yellow-50 text-yellow-800",
    label: "text-zinc-900 group-hover:text-yellow-800 group-active:text-yellow-800 transition-colors",
    labelStatic: "text-yellow-800",
    activeBg: "bg-yellow-50/80",
  },
};

/** Semantic outline + content colors for stat cards */
export const statCardAccent = {
  blue: {
    border: "border-blue-600",
    icon: "border border-blue-200 bg-blue-50 text-blue-700",
    value: "text-blue-600",
    label: "text-zinc-400",
    footer: "text-blue-600",
    dot: "bg-blue-600",
  },
  red: {
    border: "border-red-600",
    icon: "border border-red-200 bg-red-50 text-red-700",
    value: "text-red-600",
    label: "text-zinc-400",
    footer: "text-red-600",
    dot: "bg-red-600",
  },
  orange: {
    border: "border-orange-500",
    icon: "border border-orange-200 bg-orange-50 text-orange-700",
    value: "text-orange-600",
    label: "text-zinc-400",
    footer: "text-orange-600",
    dot: "bg-orange-500",
  },
  green: {
    border: "border-green-600",
    icon: "border border-green-200 bg-green-50 text-green-700",
    value: "text-green-600",
    label: "text-zinc-400",
    footer: "text-green-600",
    dot: "bg-green-600",
  },
  purple: {
    border: "border-purple-600",
    icon: "border border-purple-200 bg-purple-50 text-purple-700",
    value: "text-purple-600",
    label: "text-zinc-400",
    footer: "text-purple-600",
    dot: "bg-purple-600",
  },
  zinc: {
    border: "border-zinc-400",
    icon: "border border-zinc-200 bg-zinc-50 text-zinc-600",
    value: "text-zinc-900",
    label: "text-zinc-400",
    footer: "text-zinc-600",
    dot: "bg-zinc-500",
  },
  yellow: {
    border: "border-yellow-500",
    icon: "border border-yellow-200 bg-yellow-50 text-yellow-800",
    value: "text-yellow-700",
    label: "text-zinc-400",
    footer: "text-yellow-700",
    dot: "bg-yellow-500",
  },
};

/** Stat cards on dark marketing sections (e.g. Platform Pulse) */
export const statCardAccentDark = {
  blue: {
    border: "border-blue-400/25",
    shell: "border border-white/10 bg-white/5 backdrop-blur-md",
    icon: "border border-blue-400/25 bg-blue-500/15 text-blue-300",
    value: "text-blue-300",
    label: "text-zinc-400",
    footer: "text-blue-300",
    dot: "bg-blue-400",
  },
  red: {
    border: "border-red-400/25",
    shell: "border border-white/10 bg-white/5 backdrop-blur-md",
    icon: "border border-red-400/25 bg-red-500/15 text-red-300",
    value: "text-red-300",
    label: "text-zinc-400",
    footer: "text-red-300",
    dot: "bg-red-400",
  },
  orange: {
    border: "border-orange-400/25",
    shell: "border border-white/10 bg-white/5 backdrop-blur-md",
    icon: "border border-orange-400/25 bg-orange-500/15 text-orange-300",
    value: "text-orange-300",
    label: "text-zinc-400",
    footer: "text-orange-300",
    dot: "bg-orange-400",
  },
  green: {
    border: "border-green-400/25",
    shell: "border border-white/10 bg-white/5 backdrop-blur-md",
    icon: "border border-green-400/25 bg-green-500/15 text-green-300",
    value: "text-green-300",
    label: "text-zinc-400",
    footer: "text-green-300",
    dot: "bg-green-400",
  },
  purple: {
    border: "border-purple-400/25",
    shell: "border border-white/10 bg-white/5 backdrop-blur-md",
    icon: "border border-purple-400/25 bg-purple-500/15 text-purple-300",
    value: "text-purple-300",
    label: "text-zinc-400",
    footer: "text-purple-300",
    dot: "bg-purple-400",
  },
  zinc: {
    border: "border-white/15",
    shell: "border border-white/10 bg-white/5 backdrop-blur-md",
    icon: "border border-white/15 bg-white/10 text-zinc-200",
    value: "text-zinc-100",
    label: "text-zinc-400",
    footer: "text-zinc-300",
    dot: "bg-zinc-400",
  },
  yellow: {
    border: "border-yellow-400/25",
    shell: "border border-white/10 bg-white/5 backdrop-blur-md",
    icon: "border border-yellow-400/25 bg-yellow-500/15 text-yellow-200",
    value: "text-yellow-200",
    label: "text-zinc-400",
    footer: "text-yellow-200",
    dot: "bg-yellow-400",
  },
};

export const severityOutline = {
  Critical: {
    border: "border-red-600",
    badge: "bg-red-100 text-red-700",
    icon: "border-red-200 bg-red-50 text-red-700",
    title: "text-zinc-900 group-hover:text-red-600 group-active:text-red-600 transition-colors",
    titleStatic: "text-red-600",
    headerBg: "bg-red-600",
    headerFg: "text-white",
    headerBadge: "bg-white/20 text-white",
    headerIcon: "bg-white/20 text-white",
    ctaBg: "bg-red-50 border-red-100",
    ctaLabel: "text-red-700",
    ctaBody: "text-red-900",
    ctaIcon: "text-red-600",
  },
  High: {
    border: "border-orange-500",
    badge: "bg-orange-100 text-orange-700",
    icon: "border-orange-200 bg-orange-50 text-orange-700",
    title: "text-zinc-900 group-hover:text-orange-600 group-active:text-orange-600 transition-colors",
    titleStatic: "text-orange-600",
    headerBg: "bg-orange-500",
    headerFg: "text-white",
    headerBadge: "bg-white/20 text-white",
    headerIcon: "bg-white/20 text-white",
    ctaBg: "bg-orange-50 border-orange-100",
    ctaLabel: "text-orange-700",
    ctaBody: "text-orange-900",
    ctaIcon: "text-orange-600",
  },
  Medium: {
    border: "border-yellow-500",
    badge: "bg-yellow-100 text-yellow-700",
    icon: "border-yellow-200 bg-yellow-50 text-yellow-800",
    title: "text-zinc-900 group-hover:text-yellow-700 group-active:text-yellow-700 transition-colors",
    titleStatic: "text-yellow-700",
    headerBg: "bg-yellow-500",
    headerFg: "text-zinc-900",
    headerBadge: "bg-zinc-900/10 text-zinc-900",
    headerIcon: "bg-zinc-900/10 text-zinc-900",
    ctaBg: "bg-yellow-50 border-yellow-200",
    ctaLabel: "text-yellow-800",
    ctaBody: "text-yellow-950",
    ctaIcon: "text-yellow-700",
  },
  Low: {
    border: "border-blue-600",
    badge: "bg-blue-100 text-blue-700",
    icon: "border-blue-200 bg-blue-50 text-blue-700",
    title: "text-zinc-900 group-hover:text-blue-600 group-active:text-blue-600 transition-colors",
    titleStatic: "text-blue-600",
    headerBg: "bg-blue-600",
    headerFg: "text-white",
    headerBadge: "bg-white/20 text-white",
    headerIcon: "bg-white/20 text-white",
    ctaBg: "bg-blue-50 border-blue-100",
    ctaLabel: "text-blue-700",
    ctaBody: "text-blue-900",
    ctaIcon: "text-blue-600",
  },
};

export const priorityOutline = {
  CRITICAL: {
    border: "border-red-600",
    icon: "border-red-200 bg-red-50 text-red-700",
    title: "text-zinc-900 group-hover:text-red-600 group-active:text-red-600 transition-colors",
    unreadBg: "bg-red-50/40",
  },
  HIGH: {
    border: "border-orange-500",
    icon: "border-orange-200 bg-orange-50 text-orange-700",
    title: "text-zinc-900 group-hover:text-orange-600 group-active:text-orange-600 transition-colors",
    unreadBg: "bg-orange-50/40",
  },
  NORMAL: {
    border: "border-blue-600",
    icon: "border-blue-200 bg-blue-50 text-blue-700",
    title: "text-zinc-900 group-hover:text-blue-600 group-active:text-blue-600 transition-colors",
    unreadBg: "bg-blue-50/40",
  },
  LOW: {
    border: "border-zinc-400",
    icon: "border-zinc-200 bg-zinc-50 text-zinc-600",
    title: "text-zinc-900 group-hover:text-zinc-600 group-active:text-zinc-600 transition-colors",
    unreadBg: "bg-zinc-50",
  },
};

export function getInfoCardAccent(accent = "blue") {
  return infoCardAccent[accent] || infoCardAccent.blue;
}

export function getStatCardAccent(accent = "blue", { dark = false } = {}) {
  if (dark) {
    return statCardAccentDark[accent] || statCardAccentDark.blue;
  }
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
  shell: "text-left min-w-0",
  compact: "text-left min-w-0",
  dashboard: "text-left min-w-0",
  public: "text-left min-w-0",
  iconWrap: "flex h-10 w-10 items-center justify-center rounded-lg shrink-0 [&_svg]:size-4 sm:[&_svg]:size-[18px]",
  iconRow: "flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3",
  label: "text-[9px] sm:text-[10px] font-black uppercase tracking-wide sm:tracking-widest leading-tight line-clamp-2",
};

/** Auth login / register — fixed viewport card, no page scroll */
export const authForm = {
  card: "w-full max-w-md max-h-[calc(100dvh-5.5rem)] overflow-hidden p-5 sm:p-6 border-none shadow-2xl bg-white rounded-[28px]",
  cardWide: "w-full max-w-lg max-h-[calc(100dvh-5.5rem)] overflow-hidden p-5 sm:p-6 border-none shadow-2xl bg-white rounded-[28px]",
  header: "text-center mb-4",
  iconWrap: "border border-blue-200 bg-blue-50 text-blue-700 size-11 rounded-xl flex items-center justify-center mx-auto mb-3",
  input: "w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 disabled:opacity-50",
  label: "text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1",
  fieldGap: "space-y-1",
  formGap: "space-y-3",
  submitBtn:
    "w-full py-3.5 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:bg-blue-400",
  footer: "mt-4 pt-4 border-t border-zinc-50 text-center",
};

/** Shared vertical rhythm — 24px (`gap-6`) between major page blocks */
export const portalLayout = {
  stack: "flex flex-col gap-6",
  /** Stat cards + quick links directly beneath (Command Center reference) */
  dashboardKpiSection: "flex flex-col gap-2 min-w-0",
  dashboardQuickLinks: "flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5",
  /** Tourist/public pages — tighter vertical rhythm (admin/guide keep `stack`) */
  stackPublic: "flex flex-col gap-4",
  padBottom: "pb-8",
  grid: "gap-6",
  gridPublic: "gap-4",
  /** Scroll long lists beside a sticky map without stretching the page */
  scrollPane: "max-h-[min(520px,calc(100vh-11rem))] overflow-y-auto overscroll-contain",
  /** Global split/list layout (Active Announcements reference pattern) */
  splitGridPublic: "grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch",
  splitGrid: "grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch",
  /** Archive & History — three columns, two stacked rows */
  archiveGrid: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch",
  panelBodyStack: "flex flex-col min-h-0",
  panelFill: "flex flex-col min-h-0 h-full",
  listScrollPane:
    "flex-1 min-h-0 overflow-y-auto overscroll-contain max-h-[min(400px,45vh)] lg:max-h-[min(420px,55vh)]",
  /** Command Center active incidents — slightly shorter list column */
  listScrollPaneCompact:
    "flex-1 min-h-0 overflow-y-auto overscroll-contain max-h-[min(340px,40vh)] lg:max-h-[min(360px,48vh)]",
  listScrollPaneAdmin:
    "flex-1 min-h-0 overflow-y-auto overscroll-contain max-h-[min(320px,38vh)] lg:max-h-[min(400px,48vh)]",
  sideMapHeight: "h-[min(480px,70vh)]",
  mapColumnBody: "relative z-0 flex flex-col flex-1 min-h-[min(480px,70vh)] p-0",
  mapColumnFill: "h-full min-h-[min(480px,70vh)]",
  /** @deprecated use splitGridPublic */
  crisisHubSplitGrid: "grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch",
  /** @deprecated use panelBodyStack */
  crisisHubAnnouncementsBody: "flex flex-col min-h-0",
  /** @deprecated use listScrollPane */
  crisisHubAnnouncementsListScroll:
    "flex-1 min-h-0 overflow-y-auto overscroll-contain max-h-[min(400px,45vh)] lg:max-h-[min(420px,55vh)]",
  /** @deprecated use sideMapHeight */
  crisisHubMapBody: "h-[min(480px,70vh)]",
  /** @deprecated use mapColumnBody */
  crisisHubMapColumnBody: "relative z-0 flex flex-col flex-1 min-h-[min(480px,70vh)] p-0",
  /** @deprecated use mapColumnFill */
  crisisHubMapFill: "h-full min-h-[min(480px,70vh)]",
};

/** Shared portal UI — admin, guide, and public/tourist panels */
export const portalShell = {
  panel: "rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm",
  panelHeader: "px-4 sm:px-6 py-4 border-b border-zinc-100 bg-zinc-50/70",
  panelHeaderCompact: "px-3 sm:px-4 py-2 border-b border-zinc-100 bg-zinc-50/70",
  panelBody: "p-4 sm:p-6",
  panelBodyCompact: "p-2.5 sm:p-3",
  pageIntro: "rounded-2xl border border-zinc-200 bg-white px-4 sm:px-6 py-4 shadow-sm",
  pageIntroDescription: "text-sm text-zinc-500 font-medium leading-relaxed line-clamp-3",
  input:
    "w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-shadow",
  select:
    "w-full min-h-11 px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 touch-manipulation",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors",
  btnSuccess:
    "inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-colors",
  btnGhost:
    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-colors disabled:opacity-40",
  btnDanger:
    "inline-flex items-center justify-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50",
  /** Primary row action on list cards (matches Command Center CTAs) */
  btnCardAction:
    "inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50",
  btnIcon:
    "inline-flex items-center justify-center p-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors",
  statMini:
    "rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 text-center min-w-0",
};

/** Admin portal layout */
export const adminShell = {
  ...portalShell,
  main: "flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-zinc-100/80",
  page: `max-w-[1520px] mx-auto w-full text-left ${portalLayout.stack} ${portalLayout.padBottom}`,
};

/** Guide portal layout */
export const guideShell = {
  ...portalShell,
  main: "flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-zinc-100/80",
  page: `max-w-[1520px] mx-auto w-full text-left ${portalLayout.stack} ${portalLayout.padBottom}`,
  btnGuide:
    "inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-colors",
};

/** Public / tourist content layout */
export const publicShell = {
  ...portalShell,
  pageRoot: "min-h-[50vh] w-full font-sans text-left",
  pageNarrow: `max-w-4xl mx-auto w-full ${portalLayout.stackPublic} ${portalLayout.padBottom}`,
  pageWide: `max-w-7xl mx-auto w-full ${portalLayout.stackPublic} ${portalLayout.padBottom}`,
};

