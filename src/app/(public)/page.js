"use client";

import React, { useEffect, useState, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Compass, FileText, ShieldCheck, Users } from "lucide-react";
import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";
import { typography } from "@/lib/designSystem";
import { BrandLogo } from "@/app/components/BrandLogo";
import { siteInfo } from "@/lib/siteInfo";
import { sortRecordsNewestFirst } from "@/lib/recordSorting";
import { GuideAssistanceRequestForm } from "@/app/components/tourist/GuideAssistanceRequestForm";

export default function Home() {
  const { fetchAlerts, alerts, loading, error } = useCrisisStore();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [guideAssistance, setGuideAssistance] = useState(null);
  const [guideRequestOpen, setGuideRequestOpen] = useState(false);
  const [guideRequestSubmitted, setGuideRequestSubmitted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "tourist") return undefined;
    let active = true;
    fetch("/api/tourist/guide-assistance", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load service availability.");
        if (active) setGuideAssistance(result.assistance);
      })
      .catch(() => {
        if (active) setGuideAssistance(null);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.role]);

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
  const criticalCount = activeAlerts.filter((alert) => alert.severity === "Critical").length;
  const newestAlert = activeAlerts[0] || null;
  const showGuideHelp = isAuthenticated && user?.role === "tourist" && guideAssistance?.enabled === true;

  return (
    <div className="flex flex-col bg-white font-sans text-left">
      <section
        data-landing-section="hero"
        className="relative flex w-full flex-col justify-center overflow-hidden bg-cover bg-center bg-no-repeat pt-[calc(4.5rem+env(safe-area-inset-top))] pb-8 md:min-h-[50vh] md:py-16"
        style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-blue-900/60 to-indigo-950/80" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start px-3 sm:px-6">
          <div className="w-full max-w-3xl">
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
            <h1 className="text-xl font-black uppercase leading-tight tracking-tighter text-white md:text-4xl lg:text-5xl">
              Travel Safely in <span className="text-blue-400">Daet, Camarines Norte.</span>
            </h1>
            <p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-zinc-200 md:text-base">
              Real-time crisis alerts, safe routes, and official guidance from the {siteInfo.officeName}.
            </p>

            <div className="mt-5 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
              <Link
                href="/crisis"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-blue-700"
              >
                {isAuthenticated ? "Open Crisis Hub" : "View Live Alerts"}
                <ArrowRight size={16} />
              </Link>
              {isAuthenticated ? (
                <Link
                  href="/crisis/reports"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-zinc-900"
                >
                  <FileText size={16} className="text-blue-600" />
                  My Reports
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-zinc-900"
                >
                  <Users size={16} className="text-blue-600" />
                  Register
                </Link>
              )}
            </div>

            {isAuthenticated ? (
              <p className="mt-5 text-sm font-bold text-white md:hidden">
                {loading ? "Checking alerts..." : `${activeAlerts.length} active alert${activeAlerts.length === 1 ? "" : "s"}`}
              </p>
            ) : null}

            <div className="mt-6 hidden w-full max-w-sm grid-cols-2 gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-4 text-center md:grid">
              <div>
                <p className="text-2xl font-black text-white">{loading ? "—" : activeAlerts.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100">Active alerts</p>
              </div>
              <div className="border-l border-white/15">
                <p className="text-2xl font-black text-red-300">{loading ? "—" : criticalCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100">Critical</p>
              </div>
            </div>
            {error ? (
              <p className="mt-2 text-xs font-bold text-red-300">Could not load alert counts.</p>
            ) : null}

            {showGuideHelp ? (
              <div id="guide-assistance" className="mt-5 w-full max-w-xl">
                <button
                  type="button"
                  onClick={() => {
                    setGuideRequestSubmitted(false);
                    setGuideRequestOpen(true);
                  }}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800 sm:w-auto"
                >
                  <Compass size={17} /> Request guide help
                </button>
                <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-200">
                  Tourism help from a local guide. This is not an emergency service.
                </p>
                {guideRequestSubmitted ? (
                  <p role="status" className="mt-2 text-sm font-bold text-green-200">
                    Your request was submitted. The Tourism Office will coordinate a guide.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {!isAuthenticated ? (
        <section className="border-b border-zinc-100 bg-white py-6 md:py-10">
          <div className="mx-auto max-w-7xl px-3 sm:px-6">
            {loading ? (
              <p className="text-sm font-medium text-zinc-500">Checking active alerts...</p>
            ) : newestAlert ? (
              <Link href="/crisis" className="block rounded-2xl border border-orange-200 bg-orange-50/40 p-4 hover:border-orange-300">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-700">
                  {newestAlert.severity || "Alert"} · {newestAlert.location || "Daet"}
                </p>
                <h2 className="mt-1 text-lg font-black text-zinc-900">{newestAlert.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm font-medium text-zinc-600">{newestAlert.message}</p>
              </Link>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
                <ShieldCheck className="mt-0.5 shrink-0 text-green-700" size={22} />
                <div>
                  <h2 className="text-lg font-black text-zinc-900">All clear</h2>
                  <p className="mt-1 text-sm font-medium text-zinc-600">
                    No active crisis alerts in Daet right now.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {guideRequestOpen && guideAssistance?.enabled === true ? (
        <GuideAssistanceRequestForm
          assistance={guideAssistance}
          onClose={() => setGuideRequestOpen(false)}
          onSubmitted={() => setGuideRequestSubmitted(true)}
        />
      ) : null}
    </div>
  );
}
