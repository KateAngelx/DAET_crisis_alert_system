"use client";

import React, { useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Bell, FileText, FileWarning, Phone, Route, ShieldCheck } from "lucide-react";
import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";
import { typography } from "@/lib/designSystem";
import { BrandLogo } from "@/app/components/BrandLogo";
import { siteInfo } from "@/lib/siteInfo";
import { sortRecordsNewestFirst } from "@/lib/recordSorting";
import { usePublicVisibility } from "@/lib/usePublicVisibility";
import { TouristHomeCards } from "@/app/components/tourist/TouristHomeCards";
import { PublicFeedbackSection } from "@/app/components/feedback/PublicFeedbackSection";
import { useHydrated } from "@/lib/useHydrated";
import { FEATURE_NAMES } from "@/lib/featureNames";

export default function Home() {
  const { fetchAlerts, alerts, alertsLoaded, loading: fetching, error } = useCrisisStore();
  const loading = fetching || (!alertsLoaded && !error);
  const { isAuthenticated, user } = useAuthStore();
  const mounted = useHydrated();
  const visibility = usePublicVisibility();
  const router = useRouter();

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useLayoutEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (user?.role === "admin") router.replace("/admin");
    if (user?.role === "guide") router.replace("/guide");
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || (isAuthenticated && (user?.role === "admin" || user?.role === "guide"))) return null;

  const activeAlerts = sortRecordsNewestFirst(
    alerts.filter((alert) => alert.status === "Active" && alert.is_public),
    ["published_at", "created_at"]
  );
  const previewAlerts = activeAlerts.slice(0, 3);
  const isTourist = isAuthenticated && user?.role === "tourist";
  const featureCards = [
    {
      title: "Alerts",
      text: "Open the map and the active list.",
      href: "/crisis",
      icon: AlertTriangle,
      tile: "bg-orange-50 text-orange-600",
    },
    visibility.roadsAndHazards
      ? {
          title: FEATURE_NAMES.roads,
          text: "Check road closures and hazards.",
          href: "/routes",
          icon: Route,
          tile: "bg-blue-50 text-blue-600",
        }
      : null,
    {
      title: isAuthenticated ? "Reports" : "Report a problem",
      text: isAuthenticated ? "Send a report and follow it." : "No account needed. Tell the Tourism Office what happened.",
      href: isAuthenticated ? "/crisis/reports" : "/crisis/report",
      icon: FileText,
      tile: "bg-sky-50 text-sky-700",
    },
    {
      title: "Phone and SMS alerts",
      text: isAuthenticated
        ? "Turn channels on or off in Profile."
        : "Register, then choose email, SMS, and app alerts.",
      href: isAuthenticated ? "/profile" : "/register",
      icon: Bell,
      tile: "bg-violet-50 text-violet-700",
    },
  ].filter(Boolean);

  return (
    <div className="flex flex-col bg-white font-sans text-left">
      <section
        data-landing-section="hero"
        className="relative flex w-full flex-col justify-center overflow-hidden bg-cover bg-center bg-no-repeat pt-[calc(4rem+env(safe-area-inset-top))] pb-8 md:-mt-16 md:min-h-[100dvh] md:py-16"
        style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-blue-900/60 to-indigo-950/80" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex w-full flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            {isAuthenticated ? (
              <h2 className="mb-3 text-2xl font-black tracking-tight text-white md:text-[28px]">
                Mabuhay, {user?.name || "Traveler"}!
              </h2>
            ) : null}

            <div className="mb-4 flex items-center gap-2.5 md:mb-6">
              <BrandLogo size={36} className="h-9 w-9 md:hidden" />
              <BrandLogo size={44} className="hidden h-11 w-11 md:block" />
              <span className={`${typography.brand} text-white`}>{siteInfo.brandName}</span>
            </div>

            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-blue-300 md:text-xs">
              Official Tourism & Safety Portal
            </p>
            <h1 className="max-w-4xl text-xl font-black uppercase leading-tight tracking-tighter text-white md:text-4xl lg:text-5xl">
              Travel Safely in <span className="text-blue-400">Daet, Camarines Norte.</span>
            </h1>
            <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-zinc-200 md:text-base">
              Real-time crisis alerts, safe routes, and official guidance from the {siteInfo.officeName}.
            </p>

            <div className="mt-5 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-3">
              <Link
                href="/crisis"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-blue-700"
              >
                See alerts
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/crisis/report"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-red-700"
              >
                <FileWarning size={16} />
                {FEATURE_NAMES.reportProblem}
              </Link>
              <a
                href="tel:911"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-red-700 hover:bg-red-50"
              >
                <Phone size={16} />
                Call 911
              </a>
            </div>

            {!isAuthenticated ? (
              <p className="mt-4 text-sm font-medium text-zinc-200">
                Want SMS or email alerts?{" "}
                <Link href="/register" className="font-black text-white underline underline-offset-4 hover:text-blue-200">
                  Create a free account
                </Link>
              </p>
            ) : null}

            </div>
          </div>
        </div>
      </section>

      {isTourist ? <TouristHomeCards alerts={alerts} loading={loading} /> : (
      <section className="border-b border-zinc-100 bg-white py-6 md:py-10">
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <h2 className={typography.pageTitle}>Live alerts</h2>
          <p className={`${typography.description} mt-1`}>The newest situations in Daet. Open one to read the full alert.</p>
          {loading ? (
            <p className="mt-4 text-sm font-medium text-zinc-500">Checking active alerts...</p>
          ) : previewAlerts.length ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {previewAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center gap-3 border-b border-zinc-100 px-3 py-3 last:border-b-0 sm:px-4">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-orange-700">
                      {alert.severity || "Alert"} · {alert.location || "Daet"}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-black text-zinc-900">{alert.title}</span>
                  </span>
                  <Link
                    href={`/crisis?alert=${alert.id}`}
                    className="shrink-0 rounded-full bg-orange-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-orange-700 hover:bg-orange-100"
                  >
                    View more
                  </Link>
                </div>
              ))}
              {activeAlerts.length > previewAlerts.length ? (
                <Link href="/crisis" className="block px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50">
                  View all alerts
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <ShieldCheck className="shrink-0 text-green-700" size={18} />
              <p className="text-sm font-bold text-zinc-800">All clear. No active crisis alerts in Daet right now.</p>
            </div>
          )}
        </div>
      </section>
      )}

      <section className="border-b border-zinc-100 bg-zinc-50 py-6 md:py-10">
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <h2 className={typography.pageTitle}>What you can do</h2>
          <p className={`${typography.description} mb-4 mt-1`}>Crisis alerts, roads, reports, and how alerts reach your phone.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-blue-200"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.tile}`}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-zinc-900">{card.title}</span>
                    <span className="mt-1 block text-xs font-medium leading-relaxed text-zinc-500">{card.text}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <PublicFeedbackSection />
    </div>
  );
}
