import React from "react";
import { PortalPanel } from "@/app/components/shell/PortalPanel";
import { typography, statGrid, publicShell, portalShell, portalLayout } from "@/lib/designSystem";

/** Shared public-page tokens — same block gap as admin/guide (`portalLayout.stack`) */
export const publicLayout = {
  page: publicShell.pageRoot,
  section: "",
  sectionTitle: `${typography.cardTitle} mb-4`,
  headingToBody: "mb-4",
  pageTitle: typography.pageTitle,
  pageDescription: typography.description,
  cardGrid: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6",
  cardGridWide: statGrid.public,
  stack: "flex flex-col gap-4",
  stackTight: "flex flex-col gap-3",
  ctaCard: "p-4 sm:p-6 bg-blue-50/80 border border-blue-200 rounded-2xl",
  infoCard: "p-4 sm:p-6 bg-zinc-50/80 border border-zinc-200 rounded-2xl",
};

export function PublicPageShell({ children, wide = false, className = "" }) {
  const inner = wide ? publicShell.pageWide : publicShell.pageNarrow;
  return (
    <div className={`${publicShell.pageRoot} ${className}`}>
      <div className={inner} data-public-shell={wide ? "wide" : "narrow"}>
        {children}
      </div>
    </div>
  );
}

/** Groups page sections with compact public spacing (`stackPublic`) */
export function PublicPageContent({ children, className = "" }) {
  return <div className={`${portalLayout.stackPublic} ${className}`}>{children}</div>;
}

export function InfoPageHero({ title, description }) {
  return (
    <div className={portalShell.pageIntro}>
      <p className={`${typography.statLabel} text-blue-600 tracking-[0.2em] mb-1`}>Tourist & visitor</p>
      <h1 className={`${typography.pageTitle} mb-1`}>{title}</h1>
      {description ? <p className={portalShell.pageIntroDescription}>{description}</p> : null}
    </div>
  );
}

export function InfoSection({ title, children, className = "" }) {
  return (
    <PortalPanel title={title} className={className}>
      <div className="text-zinc-600 leading-relaxed space-y-4 text-sm font-medium">{children}</div>
    </PortalPanel>
  );
}

export function PublicInfoCallout({ label, children, variant = "blue", className = "" }) {
  const styles = variant === "zinc" ? publicLayout.infoCard : publicLayout.ctaCard;
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

export { PortalPanel as PublicPanel } from "@/app/components/shell/PortalPanel";
