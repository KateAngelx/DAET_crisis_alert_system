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
import { fetchPublicStatsCached } from "@/lib/publicStatsClient";

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
function LiveWeatherWidget() {
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
function PlatformPulseWidget() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchPublicStatsCached().then(data => setStats(data));
  }, []);

  if (!stats) return null;

  return (
    <div className="mt-2 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full shadow-sm transition-all hover:bg-white/20">
      <div className="flex items-center gap-1.5">
        <Activity size={14} className="text-blue-300" />
        <span className="text-sm font-black tracking-tight">{stats.viewsToday || 0}</span>
        <span className="text-[9px] font-bold text-blue-200 tracking-widest uppercase">Views Today</span>
      </div>
      <div className="w-px h-3 bg-white/30"></div>
      <div className="flex items-center gap-1.5">
        <Users size={14} className="text-blue-300" />
        <span className="text-sm font-black tracking-tight">{stats.uniqueVisitorsToday || 0}</span>
        <span className="text-[9px] font-bold text-blue-200 tracking-widest uppercase">Visitors</span>
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

  return (
    <div className="flex flex-col bg-white font-sans text-left">
      
      {/* 1. HERO SECTION */}
      <section
        data-landing-section="hero"
        className="relative w-full py-16 sm:py-20 lg:py-24 min-h-[calc(100dvh-4rem)] sm:min-h-[600px] overflow-hidden flex flex-col justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-bg.jpg')" }} 
      >
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/95 via-zinc-900/60 to-zinc-900/10 sm:to-transparent" aria-hidden="true"></div>

        <div className="absolute top-24 right-4 sm:top-24 sm:right-8 z-20 animate-in fade-in slide-in-from-top-4 duration-700 flex flex-col items-end">
          <LiveWeatherWidget />
          <PlatformPulseWidget />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full z-10 flex flex-col items-start text-left">
          <div className="max-w-3xl">
            {isAuthenticated && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 w-full mb-6">
                <h2 className={`${typography.pageTitle} text-blue-400 leading-none mb-1.5`}>
                  Mabuhay, {user?.name || 'Traveler'}!
                </h2>
                <p className="text-sm text-zinc-300 font-medium">
                  Check active alerts, affected areas, and safety instructions for Daet.
                </p>
              </div>
            )}

            <div className="space-y-4 w-full flex flex-col items-start mb-10">
              <div className="flex items-center gap-3">
                <BrandLogo size={44} />
                <span className={`${typography.brand} text-white`}>{siteInfo.brandName}</span>
              </div>
              
              <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.12em] sm:tracking-[0.15em] text-blue-400 leading-snug">
                Official Tourism & Safety Portal
              </p>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter text-white leading-tight">
                Travel Safely in <br className="hidden sm:block" />
                <span className="text-blue-500">Daet, Camarines Norte.</span>
              </h1>
              
              <p className="text-sm sm:text-base md:text-lg text-zinc-300 font-medium max-w-xl leading-relaxed">
                Access real-time emergency alerts, safe route recommendations, and official safety guidance directly from the {siteInfo.officeName} to ensure a secure and enjoyable journey.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto mb-10">
              <Link
                href="/crisis"
                className="group flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-full font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
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
            <div className="pt-6 sm:pt-8 border-t border-white/20 w-full max-w-lg flex items-center justify-start gap-8 sm:gap-10">
              <div className="text-left min-w-0">
                <p className="text-xl sm:text-2xl font-black text-white leading-none mb-1">{activeAlerts.length}</p>
                <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">Active Alerts</p>
              </div>
              <div className="text-left min-w-0">
                <p className="text-xl sm:text-2xl font-black text-red-500 tabular-nums leading-none mb-1">{criticalCount}</p>
                <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">Critical</p>
              </div>
              <div className="text-left min-w-0">
                <p className="text-xl sm:text-2xl font-black text-white leading-none mb-1">24/7</p>
                <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">Monitoring</p>
              </div>
            </div>
            )}
            {error && (
              <p className="text-xs font-bold text-red-400 mt-2">Could not load alert counts. Showing cached data.</p>
            )}
          </div>
        </div>
      </section>

      {/* 2. ACTIVE ANNOUNCEMENTS & ALERTS LIST */}
      {!isAuthenticated && !loading && (
        <section className="py-12 sm:py-16 bg-white border-b border-zinc-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className={`${typography.sectionTitle} text-red-600 mb-2`}>Live Updates</p>
                <h2 className={`${typography.cardTitle} md:text-2xl`}>Active Emergency Alerts</h2>
                <p className={`${typography.description} max-w-2xl mt-2`}>
                  Official announcements and crisis alerts currently active in Daet.
                </p>
              </div>
              <Link 
                href="/crisis" 
                className="shrink-0 flex items-center gap-2 bg-zinc-50 text-zinc-700 px-6 py-3.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-colors shadow-sm border border-zinc-200"
              >
                View All Alerts <ArrowRight size={14} />
              </Link>
            </div>

            {activeAlerts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {activeAlerts.slice(0, 3).map((alert) => {
                  const isCritical = alert.severity === "Critical";
                  return (
                    <Link href="/crisis" key={alert.id} className="block group">
                      <div className={`p-5 sm:p-6 rounded-2xl border transition-all flex flex-col sm:flex-row gap-4 sm:items-center ${isCritical ? 'border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300' : 'border-orange-200 bg-orange-50/30 hover:border-orange-300 hover:shadow-md'}`}>
                        
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${isCritical ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-600'}`}>
                          <AlertTriangle size={24} strokeWidth={2.25} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isCritical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              {alert.severity}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              {alert.type} • {alert.location}
                            </span>
                          </div>
                          <h4 className="text-base sm:text-lg font-black text-zinc-900 group-hover:text-blue-600 transition-colors truncate">{alert.title}</h4>
                          <p className="text-sm text-zinc-600 font-medium truncate mt-1">{alert.message}</p>
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
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 shadow-sm">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
                  <ShieldCheck size={28} />
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
        <section data-landing-section="alert-status" className="py-12 sm:py-16 bg-zinc-50 border-b border-zinc-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
      <section className="py-12 sm:py-16 bg-zinc-50 relative z-20 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-left">
          
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
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

          <div className="flex lg:grid lg:grid-cols-4 overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-5 pb-4 sm:pb-6 -mx-4 px-4 lg:mx-0 lg:px-0 lg:pb-0 scrollbar-none">
            <div className="w-[85vw] sm:w-[320px] lg:w-auto shrink-0 snap-center h-full">
              <ServiceCard
                title="Crisis Hub"
                icon={ShieldCheck}
                accent="blue" // Standardized Outline
                desc="Active emergency alerts, affected-area map, safety instructions, and official announcements from the Daet Municipal Tourism Office."
                href="/crisis"
              />
            </div>
            <div className="w-[85vw] sm:w-[320px] lg:w-auto shrink-0 snap-center h-full">
              <ServiceCard
                title="Roads & Travel"
                icon={Navigation}
                accent="blue" // Standardized Outline
                desc="Route status, detours, area hazards, and tourism-office recommended paths on one map."
                href="/routes"
              />
            </div>
            <div className="w-[85vw] sm:w-[320px] lg:w-auto shrink-0 snap-center h-full">
              <ServiceCard
                title="Incident Reporting"
                icon={FileText}
                accent="blue" // Standardized Outline
                desc="Report a hazard or emergency with location details and track response status from the tourism office."
                href="/crisis/reports"
              />
            </div>
            <div className="w-[85vw] sm:w-[320px] lg:w-auto shrink-0 snap-center h-full">
              <ServiceCard
                title="Alert Notifications"
                icon={Radio}
                accent="blue" // Standardized Outline
                desc="Sign in to receive private in-app updates when the tourism office responds to your reports or account activity occurs."
                href="/login"
              />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 5. HOW IT WORKS (Get Started) - CAROUSEL ON MOBILE + BIG BLUE GRID */}
      {!isAuthenticated && (
      <section className="py-12 sm:py-16 bg-white border-b border-zinc-100 relative overflow-hidden">
        {/* Big Blue Grid Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f615_2px,transparent_2px),linear-gradient(to_bottom,#3b82f615_2px,transparent_2px)] bg-[size:64px_64px]" aria-hidden="true"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" aria-hidden="true"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-10 text-center sm:text-left">
            <p className={`${typography.sectionTitle} text-blue-600 mb-2`}>Get Started</p>
            <h2 className={`${typography.cardTitle} md:text-2xl`}>
              Stay Safe in 3 Simple Steps
            </h2>
          </div>

          <div className="flex lg:grid lg:grid-cols-3 overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-5 pb-4 sm:pb-6 -mx-4 px-4 lg:mx-0 lg:px-0 lg:pb-0 scrollbar-none">
            <div className="w-[85vw] sm:w-[320px] lg:w-auto shrink-0 snap-center h-full flex flex-col items-start p-5 sm:p-6 rounded-2xl border-2 border-blue-200 bg-white/95 shadow-sm backdrop-blur-sm hover:border-blue-400 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <UserPlus size={20} strokeWidth={2.25} />
                </div>
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wide text-blue-900">1. Register</h4>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed flex-1">Create a free account to ensure the tourism office can reach you during your stay.</p>
            </div>
            
            <div className="w-[85vw] sm:w-[320px] lg:w-auto shrink-0 snap-center h-full flex flex-col items-start p-5 sm:p-6 rounded-2xl border-2 border-blue-200 bg-white/95 shadow-sm backdrop-blur-sm hover:border-blue-400 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Settings size={20} strokeWidth={2.25} />
                </div>
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wide text-blue-900">2. Set Preferences</h4>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed flex-1">Choose exactly how you want to receive alerts: via Email, SMS, or In-App notifications.</p>
            </div>

            <div className="w-[85vw] sm:w-[320px] lg:w-auto shrink-0 snap-center h-full flex flex-col items-start p-5 sm:p-6 rounded-2xl border-2 border-blue-200 bg-white/95 shadow-sm backdrop-blur-sm hover:border-blue-400 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShieldCheck size={20} strokeWidth={2.25} />
                </div>
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wide text-blue-900">3. Travel Safely</h4>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed flex-1">Enjoy your trip knowing you will be instantly notified if an emergency occurs.</p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 6. COMMUNICATION CHANNELS SECTION - CAROUSEL ON MOBILE */}
      <section className="py-12 sm:py-16 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-8 text-left">
            <p className={`${typography.sectionTitle} text-blue-600 mb-2`}>Communication Channels</p>
            <h2 className={`${typography.cardTitle} mb-2`}>
              How {siteInfo.officeName} Reaches You During a Crisis
            </h2>
            <p className={`${typography.description} max-w-2xl`}>
              {siteInfo.brandName} is the official tourist crisis communication platform. When an emergency alert is
              issued, registered users may receive it through these channels.
            </p>
          </div>

          <div className="flex lg:grid lg:grid-cols-3 overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-5 pb-4 sm:pb-6 -mx-4 px-4 lg:mx-0 lg:px-0 lg:pb-0 scrollbar-none">
            {CHANNELS.map((channel) => (
              <div key={channel.label} className="w-[85vw] sm:w-[320px] lg:w-auto shrink-0 snap-center h-full">
                <InfoOutlineCard {...channel} className="bg-white hover:border-blue-300 transition-colors" />
              </div>
            ))}
          </div>

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