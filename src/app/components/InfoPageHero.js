import React from "react";
import { sectionHeader } from "@/app/components/sectionHeader";
import { typography, statGrid } from "@/lib/designSystem";

/** Shared public-page spacing — baseline from About section */
export const publicLayout = {
  page: "min-h-screen bg-white font-sans text-left",
  hero: sectionHeader.pageHero,
  heroInner: sectionHeader.pageHeroInner,
  heroInnerWide: sectionHeader.pageHeroInnerWide,
  content: "max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10",
  contentWide: "max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10",
  section: "mb-8 sm:mb-10",
  sectionTitle: `${typography.cardTitle} mb-4`,
  headingToBody: "mb-4",
  pageTitle: sectionHeader.title,
  pageDescription: sectionHeader.description,
  cardGrid: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6",
  cardGridWide: statGrid.public,
  stack: "space-y-4",
  stackTight: "space-y-3",
  ctaCard: "mt-12 p-6 sm:p-8 bg-blue-50 border border-blue-100 rounded-3xl",
  infoCard: "p-6 sm:p-8 bg-zinc-50 border border-zinc-200 rounded-3xl",
};

export function PublicPageShell({ children, className = "" }) {
  return <div className={`${publicLayout.page} ${className}`}>{children}</div>;
}

export function PublicPageContent({ children, wide = false, className = "" }) {
  return (
    <div className={`${wide ? publicLayout.contentWide : publicLayout.content} ${className}`}>
      {children}
    </div>
  );
}

export function InfoPageHero({ title, description, wide = false }) {
  return (
    <div className={publicLayout.hero}>
      <div className={wide ? publicLayout.heroInnerWide : publicLayout.heroInner}>
        <h1 className={publicLayout.pageTitle}>{title}</h1>
        {description && <p className={publicLayout.pageDescription}>{description}</p>}
      </div>
    </div>
  );
}

export function InfoSection({ title, children, className = "" }) {
  return (
    <section className={`${publicLayout.section} text-left ${className}`}>
      {title && <h2 className={publicLayout.sectionTitle}>{title}</h2>}
      <div className="text-zinc-600 leading-relaxed space-y-4 text-sm font-medium">{children}</div>
    </section>
  );
}

export function PublicInfoCallout({ label, children, variant = "blue", className = "" }) {
  const styles =
    variant === "zinc"
      ? publicLayout.infoCard
      : publicLayout.ctaCard.replace("mt-12", "mt-0");
  const labelColor = variant === "zinc" ? "text-zinc-500" : "text-blue-600";
  return (
    <div className={`${styles} ${className}`}>
      {label && (
        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${labelColor}`}>{label}</p>
      )}
      {children}
    </div>
  );
}
