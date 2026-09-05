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
  statValue: "text-2xl sm:text-[28px] font-black leading-none",
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

/** Responsive stat card grid layouts */
export const statGrid = {
  dashboard: "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4",
  dashboardThree: "grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4",
  public: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6",
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

/** Stat card shell classes */
export const statCard = {
  dashboard: "p-4 sm:p-5 text-left border-zinc-100 min-w-0",
  public: "p-5 sm:p-6 lg:p-8 text-left min-w-0",
  iconWrap: "p-2 sm:p-2.5 rounded-xl shrink-0",
};
