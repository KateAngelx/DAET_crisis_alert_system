"use client";
import React, { useEffect, useState, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ShieldCheck, Bell, MapPin, PhoneCall, Radio, FileText, Users, Navigation,
  Sun, Cloud, CloudFog, CloudRain, CloudLightning, ChevronDown, Mail, MessageSquare,
  UserPlus, Settings, AlertTriangle, Activity
} from "lucide-react";
import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { HeroStatSkeleton } from "@/app/components/ui/Skeletons";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { InfoOutlineCard } from "@/app/components/ui/InfoOutlineCard";
import { typography, iconSize, statGrid, getInfoCardAccent } from "@/lib/designSystem";
import { PublicFeedbackSection } from "@/app/components/feedback/PublicFeedbackSection";
import { BrandLogo } from "@/app/components/BrandLogo";
import { siteInfo } from "@/lib/siteInfo";
import { fetchPublicStatsCached, invalidatePublicStatsCache } from "@/lib/publicStatsClient";
import { MobilePopStack, MobilePopStackItem } from "@/app/components/landing/MobilePopStack";

const CHANNELS = [
  {
    icon: Mail,
    label: "Email Alerts",
    description: `Official crisis updates sent to your registered email when the ${siteInfo.officeName} broadcasts an alert.`,
    accent: "blue", // Standardized to blue
  },
  {
    icon: MessageSquare,
    label: "SMS Alerts",
    description: "Urgent text messages for active emergencies — enable in your profile after registering.",
    accent: "blue", // Standardized to blue
  },
  {
    icon: Bell,
    label: "App Notifications",
    description: `Real-time notices inside ${siteInfo.brandName} when you are signed in.`,
    accent: "blue", // Standardized to blue
  },
];

// --- LIVE WEATHER WIDGET COMPONENT ---
function LiveWeatherWidget({ layout = "pill" }) {
  const [weather, setWeather] = useState({ temp: null, icon: null, status: 'Loading...' });

  useEffect(() => {
    // Daet, Camarines Norte Coordinates
    const lat = 14.1106;
    const lon = 122.9553;
    
    // Fetch live weather data (No API Key required for Open-Meteo)
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
      .then(res => res.json())
      .then(data => {
        const temp = Math.round(data.current_weather.temperature);
        const code = data.current_weather.weathercode;
        
        let Icon = Sun;
        let status = 'Safe for travel';

        if (code === 0) { Icon = Sun; status = 'Safe for travel'; }
        else if (code >= 1 && code <= 3) { Icon = Cloud; status = 'Safe for travel'; }
        else if (code >= 45 && code <= 48) { Icon = CloudFog; status = 'Low visibility'; }
        else if (code >= 51 && code <= 67) { Icon = CloudRain; status = 'Drive carefully'; }
        else if (code >= 80 && code <= 82) { Icon = CloudRain; status = 'Drive carefully'; }
        else if (code >= 95) { Icon = CloudLightning; status = 'Caution advised'; }

        setWeather({ temp: `${temp}°C`, icon: Icon, status });
      })
      .catch(() => {
        setWeather({ temp: '----', icon: null, status: '----' });
      });
  }, []);

  if (weather.temp === null) return null;

  const Icon = weather.icon;

  if (layout === "compact") {
    return (
      <div className="hero-widget-chip inline-flex max-w-full items-center gap-2 rounded-lg px-2 py-1.5 text-zinc-900">
        {Icon && <Icon size={14} className="text-blue-600 shrink-0" />}
        <span className="text-xs font-black tabular-nums">{weather.temp}</span>
        <span className="text-[8px] font-bold uppercase tracking-wide text-zinc-500 truncate max-w-[5.5rem]">
          {weather.status}
        </span>
      </div>
    );
  }

  if (layout === "panel") {
    return (
      <div className="flex flex-1 items-center gap-2 px-3 py-1.5 min-w-0">
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/70 text-blue-600 shrink-0 ring-1 ring-white/80">
            <Icon size={15} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[7px] font-black uppercase tracking-[0.14em] text-zinc-500 leading-none">Weather</p>
          <p className="text-sm font-black leading-none text-zinc-900 tabular-nums">{weather.temp}</p>
          <p className="text-[8px] font-bold uppercase tracking-wide text-zinc-600 truncate max-w-[6.5rem] lg:max-w-[8rem]">
            {weather.status}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full shadow-sm transition-all hover:bg-white/20">
      {Icon && <Icon size={16} className="text-white" />}
      <span className="text-sm font-black tracking-tight">{weather.temp}</span>
      <span className="w-1 h-1 rounded-full bg-white/50"></span>
      <span className="text-xs font-semibold text-zinc-200 tracking-wide uppercase">{weather.status}</span>
    </div>
  );
}

// --- PLATFORM PULSE WIDGET ---
function PlatformPulseWidget({ layout = "pill" }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      fetchPublicStatsCached()
        .then((data) => {
          if (!cancelled) setStats(data);
        })
        .catch(() => {
          if (!cancelled) setStats({ available: false });
        });

    load();
    const refetchTimer = window.setTimeout(() => {
      invalidatePublicStatsCache();
      load();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearTimeout(refetchTimer);
    };
  }, []);

  if (!stats || stats.available === false) return null;

  const viewsToday = Number(stats.viewsToday) || 0;
  const uniqueVisitorsToday = Number(stats.uniqueVisitorsToday) || 0;

  if (layout === "compact") {
    return (
      <div className="hero-widget-chip inline-flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-zinc-900">
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-zinc-600">
          <Activity size={12} className="text-blue-600" />
          {viewsToday}
        </span>
        <span className="h-3 w-px bg-zinc-200" aria-hidden="true" />
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-zinc-600">
          <Users size={12} className="text-blue-600" />
          {uniqueVisitorsToday}
        </span>
      </div>
    );
  }

  if (layout === "panel") {
    return (
      <div className="flex shrink-0 items-center gap-3 border-l border-white/40 px-3 py-1.5">
        <div className="text-center min-w-[2.75rem]">
          <p className="text-[6px] font-black uppercase tracking-widest text-zinc-500 leading-tight">Views</p>
          <p className="text-sm font-black tabular-nums text-zinc-900 leading-none flex items-center justify-center gap-0.5">
            <Activity size={10} className="text-blue-600" />
            {viewsToday}
          </p>
        </div>
        <div className="text-center min-w-[2.75rem]">
          <p className="text-[6px] font-black uppercase tracking-widest text-zinc-500 leading-tight">Visitors</p>
          <p className="text-sm font-black tabular-nums text-zinc-900 leading-none flex items-center justify-center gap-0.5">
            <Users size={10} className="text-blue-600" />
            {uniqueVisitorsToday}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full shadow-sm transition-all hover:bg-white/20">
      <div className="flex items-center gap-1.5">
        <Activity size={14} className="text-blue-300" />
        <span className="text-sm font-black tracking-tight">{viewsToday}</span>
        <span className="text-[9px] font-bold text-blue-200 tracking-widest uppercase">Views Today</span>
      </div>
      <div className="w-px h-3 bg-white/30"></div>
      <div className="flex items-center gap-1.5">
        <Users size={14} className="text-blue-300" />
        <span className="text-sm font-black tracking-tight">{uniqueVisitorsToday}</span>
        <span className="text-[9px] font-bold text-blue-200 tracking-widest uppercase">Visitors</span>
      </div>
    </div>
  );
}

function HeroLivePanel({ variant = "desktop" }) {
  if (variant === "mobile") {
    return (
      <div className="flex flex-col items-start gap-1.5 mb-3">
        <LiveWeatherWidget layout="compact" />
        <PlatformPulseWidget layout="compact" />
      </div>
    );
  }

  return (
    <div className="hero-status-panel hero-status-panel--wide rounded-lg overflow-hidden ring-1 ring-white/20">
      <div className="flex items-stretch min-h-[2.35rem]">
        <LiveWeatherWidget layout="panel" />
        <PlatformPulseWidget layout="panel" />
      </div>
    </div>
  );
}
// -------------------------------------

export default function Home() {
  const { fetchAlerts, alerts, loading, error } = useCrisisStore();
  const { isAuthenticated, user } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    setMounted(true);
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!mounted || !isAuthenticated || !user?.id) return;
    fetchNotifications(user.id);
  }, [mounted, isAuthenticated, user?.id, fetchNotifications]);

  useLayoutEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (user?.role === 'admin') router.replace('/admin');
    if (user?.role === 'guide') router.replace('/guide');
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || (isAuthenticated && (user?.role === 'admin' || user?.role === 'guide'))) return null;

  // Filter alerts by Active & Public, then sort so Critical alerts appear first
  const activeAlerts = alerts
    .filter((a) => a.status === "Active" && a.is_public)
    .sort((a, b) => {
      if (a.severity === "Critical" && b.severity !== "Critical") return -1;
      if (a.severity !== "Critical" && b.severity === "Critical") return 1;
      return 0;
    });
    
  const criticalCount = activeAlerts.filter((a) => a.severity === "Critical").length;

  const quickLinks = [
    { href: "/crisis", label: "Alerts", icon: AlertTriangle },
    { href: "/routes", label: "Routes", icon: Navigation },
    { href: "/faq", label: "FAQ", icon: FileText },
    { href: isAuthenticated ? "/profile" : "/login", label: isAuthenticated ? "Profile" : "Sign In", icon: Users },
  ];

  return (
    <div className="flex flex-col bg-white font-sans text-left">
      
      {/* 1. HERO SECTION */}
      <section
        data-landing-section="hero"
        className="relative w-full min-h-[100dvh] md:min-h-[640px] overflow-hidden flex flex-col justify-end md:justify-center bg-cover bg-center bg-no-repeat pt-[calc(3.75rem+env(safe-area-inset-top))] pb-5 md:py-20 lg:py-24"
        style={{ backgroundImage: "url('/images/hero-bg.jpg')" }} 
      >
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-900/75 to-zinc-950/90 md:bg-gradient-to-r md:from-zinc-900/88 md:via-zinc-900/55 md:to-zinc-900/15" aria-hidden="true"></div>

        <div className="hidden md:block absolute top-[5.5rem] right-6 lg:right-8 z-20 animate-in fade-in slide-in-from-top-4 duration-700 max-w-[calc(100%-2rem)]">
          <HeroLivePanel variant="desktop" />
        </div>

        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 w-full z-10 flex flex-col items-start text-left">
          <div className="max-w-3xl w-full">
            <div className="md:hidden">
              <HeroLivePanel variant="mobile" />
            </div>

            {isAuthenticated && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 w-full mb-3 md:mb-6">
                <h2 className={`${typography.pageTitle} text-blue-400 leading-none mb-1.5`}>
                  Mabuhay, {user?.name || 'Traveler'}!
                </h2>
                <p className="text-sm text-zinc-300 font-medium">
                  Check active alerts, affected areas, and safety instructions for Daet.
                </p>
              </div>
            )}

            <div className="space-y-2 md:space-y-4 w-full flex flex-col items-start mb-4 md:mb-10">
              <div className="flex items-center gap-2.5">
                <BrandLogo size={36} className="md:hidden h-9 w-9" />
                <BrandLogo size={44} className="hidden md:block h-11 w-11" />
                <span className={`${typography.brand} text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)] md:text-blue-400 md:[text-shadow:none]`}>
                  {siteInfo.brandName}
                </span>
              </div>
              
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.12em] md:tracking-[0.15em] text-blue-400 leading-snug">
                Official Tourism & Safety Portal
              </p>
              
              <h1 className="text-xl leading-[1.2] md:text-4xl lg:text-5xl font-black uppercase tracking-tighter text-white">
                Travel Safely in{" "}
                <span className="text-blue-400">Daet, Camarines Norte.</span>
              </h1>
              
              <p className="text-xs md:text-base lg:text-lg text-zinc-300 font-medium max-w-xl leading-relaxed">
                Real-time crisis alerts, safe routes, and official guidance from the {siteInfo.officeName}.
              </p>
            </div>

            <MobilePopStack className="md:hidden w-full mb-4">
              <div className="grid grid-cols-4 gap-1.5">
                {quickLinks.map(({ href, label, icon: Icon }) => (
                  <MobilePopStackItem key={href}>
                    <Link
                      href={href}
                      className="hero-widget-chip flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-zinc-900 active:scale-[0.98] transition-transform"
                    >
                      <Icon size={16} className="text-blue-600" strokeWidth={2.25} />
                      <span className="text-[8px] font-black uppercase tracking-wide leading-none text-center">{label}</span>
                    </Link>
                  </MobilePopStackItem>
                ))}
              </div>
            </MobilePopStack>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 w-full sm:w-auto mb-5 md:mb-10">
              <Link
                href="/crisis"
                className="group flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3.5 md:px-8 md:py-4 rounded-full font-black uppercase text-[11px] md:text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
              >
                View Live Alerts
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>

              {isAuthenticated ? (
                <Link
                  href="/crisis/reports"
                  className="flex items-center justify-center gap-3 px-8 py-4 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 transition-all shadow-sm active:scale-95"
                >
                  <FileText size={18} className="text-blue-600" />
                  <span className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                    My Reports
                  </span>
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-3 px-8 py-4 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 transition-all shadow-sm active:scale-95"
                >
                  <Users size={18} className="text-blue-600" />
                  <span className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                    Register for Alerts
                  </span>
                </Link>
              )}
            </div>

            {loading ? (
              <HeroStatSkeleton />
            ) : (
            <div className="pt-4 md:pt-8 border-t border-white/20 w-full max-w-md mx-auto md:mx-0 md:max-w-lg">
              <div className="grid grid-cols-3 gap-2 md:gap-10 md:flex md:items-center md:justify-start text-center md:text-left">
                <div className="min-w-0 flex flex-col items-center md:items-start">
                  <p className="text-xl md:text-2xl font-black text-white leading-none mb-1">{activeAlerts.length}</p>
                  <p className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">Active Alerts</p>
                </div>
                <div className="min-w-0 flex flex-col items-center md:items-start">
                  <p className="text-xl md:text-2xl font-black text-red-500 tabular-nums leading-none mb-1">{criticalCount}</p>
                  <p className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">Critical</p>
                </div>
                <div className="min-w-0 flex flex-col items-center md:items-start">
                  <p className="text-xl md:text-2xl font-black text-white leading-none mb-1">24/7</p>
                  <p className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">Monitoring</p>
                </div>
              </div>
            </div>
            )}
            {error && (
              <p className="text-xs font-bold text-red-400 mt-2 text-center md:text-left">Could not load alert counts. Showing cached data.</p>
            )}

            <div className="relative z-10 flex justify-center pt-2 pb-1 md:hidden pointer-events-none" aria-hidden="true">
              <ChevronDown size={18} className="text-white/45 animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. ACTIVE ANNOUNCEMENTS & ALERTS LIST */}
      {!isAuthenticated && !loading && (
        <section className="py-8 md:py-16 bg-white border-b border-zinc-100">
          <div className="max-w-7xl mx-auto px-3 sm:px-6">
            
            <div className="mb-5 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
              <div>
                <p className={`${typography.sectionTitle} text-red-600 mb-2`}>Live Updates</p>
                <h2 className={`${typography.cardTitle} md:text-2xl`}>Active Emergency Alerts</h2>
                <p className={`${typography.description} max-w-2xl mt-2`}>
                  Official announcements and crisis alerts currently active in Daet.
                </p>
              </div>
              <Link 
                href="/crisis" 
                className="shrink-0 flex items-center gap-2 bg-zinc-50 text-zinc-700 px-5 py-3 md:px-6 md:py-3.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-colors shadow-sm border border-zinc-200"
              >
                View All Alerts <ArrowRight size={14} />
              </Link>
            </div>

            {activeAlerts.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5 md:gap-4">
                {activeAlerts.slice(0, 3).map((alert) => {
                  const isCritical = alert.severity === "Critical";
                  return (
                    <Link href="/crisis" key={alert.id} className="block group">
                      <div className={`p-3.5 md:p-6 rounded-xl md:rounded-2xl border transition-all flex flex-row gap-3 md:gap-4 items-start md:items-center ${isCritical ? 'border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300' : 'border-orange-200 bg-orange-50/30 hover:border-orange-300 hover:shadow-md'}`}>
                        
                        <div className={`flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-lg md:rounded-xl shadow-sm ${isCritical ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-600'}`}>
                          <AlertTriangle size={20} strokeWidth={2.25} className="md:hidden" />
                          <AlertTriangle size={24} strokeWidth={2.25} className="hidden md:block" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
                            <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 md:px-2 md:py-1 rounded-md ${isCritical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              {alert.severity}
                            </span>
                            <span className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-wider truncate">
                              {alert.type} • {alert.location}
                            </span>
                          </div>
                          <h4 className="text-sm md:text-lg font-black text-zinc-900 group-hover:text-blue-600 transition-colors truncate">{alert.title}</h4>
                          <p className="text-xs md:text-sm text-zinc-600 font-medium truncate mt-0.5 md:mt-1">{alert.message}</p>
                        </div>
                        
                        <div className="shrink-0 hidden sm:block">
                          <div className="h-8 w-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <ArrowRight size={16} />
                          </div>
                        </div>
                        
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl md:rounded-2xl p-4 md:p-8 flex flex-col sm:flex-row sm:items-center gap-3 md:gap-6 shadow-sm">
                <div className="flex h-11 w-11 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
                  <ShieldCheck size={24} className="md:hidden" />
                  <ShieldCheck size={28} className="hidden md:block" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-700 mb-1.5">System Status</p>
                  <h4 className="text-xl font-black text-zinc-900 mb-2">All Clear</h4>
                  <p className="text-sm text-zinc-600 font-medium leading-relaxed">
                    There are currently no active crisis alerts in Daet. Enjoy your stay and travel safely. We recommend registering to receive immediate notifications if an emergency occurs.
                  </p>
                </div>
                <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Link href="/routes" className="flex items-center justify-center gap-2 bg-white border border-green-200 text-green-700 px-6 py-3.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-green-100 transition-colors shadow-sm">
                    View Travel Map <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}

          </div>
        </section>
      )}

      {/* 3. DASHBOARD SECTION (For logged in users) */}
      {isAuthenticated && user?.role === "tourist" && (
        <section data-landing-section="alert-status" className="py-8 md:py-16 bg-zinc-50 border-b border-zinc-200">
          <div className="max-w-7xl mx-auto px-3 sm:px-6">
            <h3 className={`${typography.cardTitle} mb-4`}>Your Current Alert Status</h3>
            <div className={statGrid.dashboardThree}>
              <DashboardStatCard compact label="Active Alerts" value={activeAlerts.length} accent="red" />
              <DashboardStatCard compact label="My Reports" value="Track" accent="blue" />
              <DashboardStatCard
                compact
                label="My Notifications"
                value={unreadCount > 0 ? unreadCount : "—"}
                accent="purple"
              />
            </div>
          </div>
        </section>
      )}

      {/* 4. CORE FEATURES SECTION (What You Can Check Here) - CAROUSEL ON MOBILE */}
      {!isAuthenticated && (
      <section className="py-8 md:py-16 bg-zinc-50 relative z-20 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 text-left">
          
          <div className="mb-5 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
            <div>
              <p className={`${typography.sectionTitle} text-blue-600 mb-2`}>Platform Features</p>
              <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 mb-4">
                What You Can Check Here
              </h3>
              <p className="text-zinc-500 font-medium max-w-xl text-sm leading-relaxed">
                Each section shows specific crisis information: active alerts, affected locations, report status, and official announcements from the Daet Municipal Tourism Office.
              </p>
            </div>
            <Link 
              href="/login" 
              className="shrink-0 flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-colors shadow-sm border border-red-200"
            >
              <AlertTriangle size={16} /> Report an Incident
            </Link>
          </div>

          <MobilePopStack>
            <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-5">
              <MobilePopStackItem>
                <ServiceCard
                  title="Crisis Hub"
                  icon={ShieldCheck}
                  accent="blue"
                  desc="Active emergency alerts, affected-area map, safety instructions, and official announcements from the Daet Municipal Tourism Office."
                  href="/crisis"
                />
              </MobilePopStackItem>
              <MobilePopStackItem>
                <ServiceCard
                  title="Roads & Travel"
                  icon={Navigation}
                  accent="blue"
                  desc="Route status, detours, area hazards, and tourism-office recommended paths on one map."
                  href="/routes"
                />
              </MobilePopStackItem>
              <MobilePopStackItem>
                <ServiceCard
                  title="Incident Reporting"
                  icon={FileText}
                  accent="blue"
                  desc="Report a hazard or emergency with location details and track response status from the tourism office."
                  href="/crisis/reports"
                />
              </MobilePopStackItem>
              <MobilePopStackItem>
                <ServiceCard
                  title="Alert Notifications"
                  icon={Radio}
                  accent="blue"
                  desc="Sign in to receive private in-app updates when the tourism office responds to your reports or account activity occurs."
                  href="/login"
                />
              </MobilePopStackItem>
            </div>
          </MobilePopStack>
        </div>
      </section>
      )}

      {/* 5. HOW IT WORKS (Get Started) - CAROUSEL ON MOBILE + BIG BLUE GRID */}
      {!isAuthenticated && (
      <section className="py-8 md:py-16 bg-white border-b border-zinc-100 relative overflow-hidden">
        {/* Big Blue Grid Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f615_2px,transparent_2px),linear-gradient(to_bottom,#3b82f615_2px,transparent_2px)] bg-[size:64px_64px]" aria-hidden="true"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" aria-hidden="true"></div>

        <div className="relative max-w-7xl mx-auto px-3 sm:px-6">
          <div className="mb-5 md:mb-10 text-center sm:text-left">
            <p className={`${typography.sectionTitle} text-blue-600 mb-2`}>Get Started</p>
            <h2 className={`${typography.cardTitle} md:text-2xl`}>
              Stay Safe in 3 Simple Steps
            </h2>
          </div>

          <MobilePopStack>
            <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-3 md:gap-5">
              <MobilePopStackItem>
                <div className="flex flex-col items-start p-4 md:p-6 rounded-xl md:rounded-2xl border-2 border-blue-200 bg-white shadow-sm md:shadow-md hover:border-blue-400 transition-all">
                  <div className="flex items-center gap-3 mb-3 md:mb-4">
                    <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <UserPlus size={20} strokeWidth={2.25} />
                    </div>
                    <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wide text-blue-900">1. Register</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed flex-1">Create a free account to ensure the tourism office can reach you during your stay.</p>
                </div>
              </MobilePopStackItem>
              <MobilePopStackItem>
                <div className="flex flex-col items-start p-4 md:p-6 rounded-xl md:rounded-2xl border-2 border-blue-200 bg-white shadow-sm md:shadow-md hover:border-blue-400 transition-all">
                  <div className="flex items-center gap-3 mb-3 md:mb-4">
                    <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Settings size={20} strokeWidth={2.25} />
                    </div>
                    <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wide text-blue-900">2. Set Preferences</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed flex-1">Choose exactly how you want to receive alerts: via Email, SMS, or In-App notifications.</p>
                </div>
              </MobilePopStackItem>
              <MobilePopStackItem>
                <div className="flex flex-col items-start p-4 md:p-6 rounded-xl md:rounded-2xl border-2 border-blue-200 bg-white shadow-sm md:shadow-md hover:border-blue-400 transition-all">
                  <div className="flex items-center gap-3 mb-3 md:mb-4">
                    <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <ShieldCheck size={20} strokeWidth={2.25} />
                    </div>
                    <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wide text-blue-900">3. Travel Safely</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed flex-1">Enjoy your trip knowing you will be instantly notified if an emergency occurs.</p>
                </div>
              </MobilePopStackItem>
            </div>
          </MobilePopStack>
        </div>
      </section>
      )}

      {/* 6. COMMUNICATION CHANNELS SECTION - CAROUSEL ON MOBILE */}
      <section className="py-8 md:py-16 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="mb-5 md:mb-8 text-left">
            <p className={`${typography.sectionTitle} text-blue-600 mb-2`}>Communication Channels</p>
            <h2 className={`${typography.cardTitle} mb-2`}>
              How {siteInfo.officeName} Reaches You During a Crisis
            </h2>
            <p className={`${typography.description} max-w-2xl`}>
              {siteInfo.brandName} is the official tourist crisis communication platform. When an emergency alert is
              issued, registered users may receive it through these channels.
            </p>
          </div>

          <MobilePopStack>
            <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-3 md:gap-5">
              {CHANNELS.map((channel) => (
                <MobilePopStackItem key={channel.label}>
                  <InfoOutlineCard {...channel} className="bg-white hover:border-blue-300 transition-colors shadow-sm" />
                </MobilePopStackItem>
              ))}
            </div>
          </MobilePopStack>

          {!isAuthenticated && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-colors"
              >
                Register for Alerts <ArrowRight size={14} />
              </Link>
              <p className="text-xs text-zinc-500 font-medium">
                Choose your channels in Profile after signing up.
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-zinc-200">
            <p className="text-xs text-zinc-500 font-medium">
              Past emergencies marked resolved by the Daet Municipal Tourism Office are kept for reference under <span className="font-bold text-zinc-700">Resolved</span> in the menu above.
            </p>
          </div>
        </div>
      </section>

      {/* 7. FEEDBACK SECTION */}
      <section className="bg-white">
        <PublicFeedbackSection />
      </section>

    </div>
  );
}

function ServiceCard({ title, desc, icon: Icon, accent = "blue", href = "#" }) {
  const styles = getInfoCardAccent(accent);
  return (
    <InfoOutlineCard
      href={href}
      accent={accent}
      icon={Icon}
      label={title}
      description={desc}
      className="h-full bg-white hover:border-blue-300 transition-colors"
      footer={
        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${styles.label}`}>Open</span>
      }
    />
  );
}