"use client";
import React, { useEffect, useState, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ShieldCheck, Sparkles, Ticket,
  ShoppingBag, Info, MapPin, Bell, PhoneCall
} from "lucide-react";
import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";

export default function Home() {
  const { fetchAlerts } = useCrisisStore();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Hydration and data fetching
  useEffect(() => {
    setMounted(true);
    fetchAlerts();
  }, [fetchAlerts]);

  // Strict Admin Redirect
  useLayoutEffect(() => {
    if (mounted && isAuthenticated && user?.role === 'admin') {
      router.replace('/admin');
    }
  }, [mounted, isAuthenticated, user, router]);

  // Prevent flicker for admins
  if (!mounted || (isAuthenticated && user?.role === 'admin')) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-left">
      
      {/* HERO SECTION */}
      <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-40 overflow-hidden bg-zinc-50 border-b border-zinc-200">
        {/* Background Grid Pattern & Glow */}
        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-blue-100 rounded-full blur-3xl opacity-60 mix-blend-multiply pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Content - Typography & CTAs */}
          <div className="flex flex-col items-start gap-8 z-10">
            {isAuthenticated && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                <h2 className="text-xl font-black text-blue-600 uppercase tracking-tighter leading-none mb-1">
                  Mabuhay, {user?.name || 'Traveler'}!
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Welcome back to your digital companion.
                </p>
              </div>
            )}

            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-blue-100 shadow-sm shadow-blue-100/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                Official LGU Platform
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl md:text-7xl font-black tracking-tighter leading-[0.95] uppercase text-zinc-950">
                Discover <span className="text-blue-600">Daet.</span> <br />
                <span className="text-zinc-400">Safe & Smart.</span>
              </h1>
              <p className="text-lg text-zinc-500 font-medium max-w-md leading-relaxed">
                Your all-in-one digital companion for tourism, local events, and real-time emergency coordination in Camarines Norte.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {isAuthenticated ? (
                <Link
                  href="/crisis/reports"
                  className="group flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-full font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                >
                  Track My Reports
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="group flex items-center justify-center gap-3 bg-zinc-950 text-white px-8 py-4 rounded-full font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-zinc-900/20 active:scale-95"
                >
                  Get Tourist ID
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              )}

              <Link
                href="/crisis"
                className="flex items-center justify-center gap-3 px-8 py-4 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 transition-all shadow-sm active:scale-95"
              >
                <ShieldCheck size={18} className="text-red-500" />
                <span className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                  Public Crisis Hub
                </span>
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="pt-8 border-t border-zinc-200 w-full flex items-center gap-8">
              <div>
                <p className="text-2xl font-black text-zinc-900 leading-none mb-1">24/7</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Monitoring</p>
              </div>
              <div>
                <p className="text-2xl font-black text-zinc-900 leading-none mb-1">100%</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Verified Alerts</p>
              </div>
            </div>
          </div>

          {/* Right Content - Visual Presentation */}
          <div className="relative h-[550px] w-full hidden lg:block perspective-1000">
            
            {/* Floating Card 1: Active Alert */}
            <div className="absolute top-12 right-4 bg-white p-6 rounded-[32px] shadow-2xl border border-zinc-100 w-72 animate-in slide-in-from-right-8 duration-700 delay-100 z-30 hover:-translate-y-2 transition-transform">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-red-100 p-2.5 rounded-xl text-red-600">
                  <Bell size={20} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Active Alert</p>
                  <p className="text-sm font-bold text-zinc-900">Weather Advisory</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Real-time safety broadcasts pushed directly from the Command Center.</p>
            </div>

            {/* Floating Card 2: Smart Tourism */}
            <div className="absolute bottom-16 left-0 bg-white p-6 rounded-[32px] shadow-2xl border border-zinc-100 w-72 animate-in slide-in-from-bottom-8 duration-700 delay-300 z-30 hover:-translate-y-2 transition-transform">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Smart Tourism</p>
                  <p className="text-sm font-bold text-zinc-900">Museo Bulawan</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Unlock interactive AR/VR tours and explore digital artifacts locally.</p>
            </div>

            {/* Central Dashboard Graphic */}
            <div className="absolute inset-0 m-auto w-[320px] h-[450px] bg-zinc-900 rounded-[48px] shadow-2xl overflow-hidden z-20 border-[8px] border-white flex flex-col">
              <div className="w-full bg-zinc-950 p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-500" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Connect-Daet</span>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="flex-1 bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 flex flex-col gap-4">
                <div className="w-full h-32 bg-zinc-800/50 rounded-2xl border border-white/5 animate-pulse" />
                <div className="w-3/4 h-8 bg-zinc-800/50 rounded-lg border border-white/5 animate-pulse" />
                <div className="w-full h-8 bg-zinc-800/50 rounded-lg border border-white/5 animate-pulse" />
                <div className="mt-auto w-full py-4 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/20 text-center text-[10px] font-black uppercase tracking-widest">
                  System 6 Prototype
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="py-24 bg-white relative z-20">
        <div className="max-w-7xl mx-auto px-6 text-left">
          
          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h3 className="text-4xl font-black tracking-tight uppercase text-zinc-900 leading-none">
                Smart Services
              </h3>
              <p className="text-zinc-500 font-medium mt-3 max-w-xl text-sm leading-relaxed">
                Experience a seamlessly connected journey. Access verified local tours while staying protected by the municipal crisis network.
              </p>
            </div>
            <Link 
              href="/crisis/report" 
              className="shrink-0 flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-colors border border-red-100"
            >
              <PhoneCall size={16} /> Report Emergency
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ServiceCard
              title="Crisis Hub"
              icon={<ShieldCheck size={28} />}
              desc="Real-time emergency alerts, weather updates, and direct incident reporting."
              active={true}
              href="/crisis"
            />
            <ServiceCard
              title="Digital Tours"
              icon={<Sparkles size={28} />}
              desc="Mag-explore sa Museo Bulawan gamit ang AR/VR technology at interactive digital artifacts."
            />
            <ServiceCard
              title="Smart Booking"
              icon={<Ticket size={28} />}
              desc="Online reservations para sa mga hotel, resorts, at guided tours sa Bagasbas Beach."
            />
            <ServiceCard
              title="Local Market"
              icon={<ShoppingBag size={28} />}
              desc="Suportahan ang mga lokal na artisans. Bumili ng Pili nuts at Daet souvenirs online."
            />
          </div>

          {/* Integration Banner */}
          <div className="mt-12 p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4">
             <Info className="text-blue-600 shrink-0" size={24} />
             <div>
                <p className="text-xs font-black uppercase text-blue-600 tracking-widest mb-1">Platform Integration</p>
                <p className="text-sm text-blue-800 font-medium leading-relaxed">
                  Lahat ng serbisyo ay naka-sync sa iyong <strong>Tourist ID</strong>. Makaka-earn ka ng reward points sa bawat activity na iyong gagawin sa platform.
                </p>
             </div>
          </div>

        </div>
      </section>
    </div>
  );
}

function ServiceCard({ title, desc, icon, active = false, href = "#" }) {
  return (
    <Link 
      href={href} 
      className={`p-8 rounded-[40px] border transition-all text-left flex flex-col h-full group ${
        active 
        ? 'border-blue-600 bg-white shadow-xl hover:-translate-y-2 z-10 hover:shadow-blue-600/10' 
        : 'border-gray-200 bg-zinc-50 hover:bg-zinc-100 opacity-80 cursor-not-allowed'
      }`}
      onClick={(e) => {
        if (!active) e.preventDefault();
      }}
    >
      <div className={`p-4 rounded-2xl w-fit mb-6 transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-500'}`}>
        {icon}
      </div>
      <h4 className="text-xl font-black uppercase mb-2 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
        {title}
      </h4>
      <p className="text-zinc-500 text-xs font-medium leading-relaxed mb-8 flex-1">
        {desc}
      </p>
      <div className="flex items-center justify-between mt-auto">
        <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-blue-600' : 'text-zinc-400'}`}>
          {active ? 'Explore Module' : 'Coming Soon'}
        </span>
        {active && <div className="size-2 bg-blue-600 rounded-full animate-pulse" />}
      </div>
    </Link>
  );
}