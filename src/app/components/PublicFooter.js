"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Zap, Phone, Mail, MapPin } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { typography, iconSize } from "@/lib/designSystem";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const compact = mounted && isAuthenticated;
  const showResponderPortal = mounted && user?.role === "admin";

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const footerEl = document.querySelector("[data-public-footer]");
    const faqEl = document.querySelector("[data-floating-faq]");
    if (!footerEl) return;
    const footerRect = footerEl.getBoundingClientRect();
    const faqRect = faqEl?.getBoundingClientRect();
    const overlapsFaq = faqRect
      ? footerRect.bottom > faqRect.top && footerRect.right > faqRect.left && footerRect.left < faqRect.right
      : false;
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "pre-fix",
        hypothesisId: "H3-H5",
        location: "PublicFooter.js:layout",
        message: "Public footer layout metrics",
        data: {
          innerWidth: window.innerWidth,
          compact,
          footerTop: Math.round(footerRect.top),
          footerBottom: Math.round(footerRect.bottom),
          footerHeight: Math.round(footerRect.height),
          docScrollHeight: document.documentElement.scrollHeight,
          windowScrollY: Math.round(window.scrollY),
          faqBottom: faqRect ? Math.round(faqRect.bottom) : null,
          overlapsFaq,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [mounted, compact]);

  if (compact) {
    return (
      <footer data-public-footer className="bg-zinc-950 text-white border-t border-white/5 shrink-0 pb-24 sm:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-blue-600 rounded-lg size-8 flex items-center justify-center shrink-0">
                <Zap size={iconSize.brand} className="text-white" fill="white" />
              </div>
              <div className="min-w-0">
                <span className={`${typography.brand} text-white block`}>CONNECT-DAET</span>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide leading-tight line-clamp-2">
                  Daet Tourist Crisis Communication & Emergency Alert System
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <a href="tel:911" className="hover:text-white transition-colors">911</a>
              <a href="tel:117" className="hover:text-white transition-colors">117 PNP</a>
              <Link href="/crisis" className="text-blue-400 hover:text-blue-300 transition-colors">
                Crisis Hub
              </Link>
              <Link href="/crisis/resolved" className="text-green-400 hover:text-green-300 transition-colors">
                Resolved
              </Link>
            </div>
          </div>
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-4 text-center sm:text-left">
            &copy; {currentYear} Daet LGU
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer data-public-footer className="bg-zinc-950 text-white border-t border-white/5 shrink-0 pb-24 sm:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 rounded-lg size-9 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Zap size={iconSize.brand} className="text-white" fill="white" />
              </div>
              <span className={typography.brand}>CONNECT-DAET</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm leading-relaxed font-medium">
              Daet Tourist Crisis Communication and Emergency Alert System — official alerts and incident reporting for Daet, Camarines Norte.
            </p>
          </div>

          <div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-4 text-zinc-500">Crisis Services</h3>
            <ul className="space-y-3 text-sm font-bold">
              <li><Link href="/crisis" className="text-zinc-400 hover:text-white transition-colors">Crisis Hub</Link></li>
              <li><Link href="/crisis/resolved" className="text-zinc-400 hover:text-white transition-colors">Resolved Alerts</Link></li>
              <li><Link href="/routes" className="text-zinc-400 hover:text-white transition-colors">Roads & Travel</Link></li>
              <li><Link href="/crisis/reports" className="text-zinc-400 hover:text-white transition-colors">My Reports</Link></li>
              <li>
                <Link href="/crisis" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  Live Alerts
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-4 text-zinc-500">About</h3>
            <ul className="space-y-3 text-sm font-bold">
              <li><Link href="/about" className="text-zinc-400 hover:text-white transition-colors">About the System</Link></li>
              <li><Link href="/faq" className="text-zinc-400 hover:text-white transition-colors">FAQs</Link></li>
              <li><Link href="/contact" className="text-zinc-400 hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-4 text-zinc-500">Emergency Contacts</h3>
            <ul className="space-y-3 text-sm font-bold">
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span className="text-zinc-400 leading-snug text-xs sm:text-sm">Municipal Hall, Daet, Camarines Norte</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-blue-500 shrink-0" />
                <a href="tel:911" className="text-zinc-400 hover:text-white transition-colors">911 — National Emergency</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-blue-500 shrink-0" />
                <a href="tel:117" className="text-zinc-400 hover:text-white transition-colors">117 — PNP</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-blue-500 shrink-0" />
                <a href="mailto:crisis@connect-daet.ai" className="text-zinc-400 hover:text-white transition-colors truncate text-xs sm:text-sm">crisis@connect-daet.ai</a>
              </li>
              {showResponderPortal && (
                <li className="pt-1">
                  <Link href="/admin" className="inline-block bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-blue-400 hover:bg-zinc-800 transition-all text-xs">
                    Responder Portal
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 sm:mt-10 pt-5 sm:pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center md:text-left max-sm:max-w-[calc(100%-5rem)] max-sm:leading-relaxed">
            &copy; {currentYear} CONNECT-DAET — Daet LGU Crisis Alert System
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 max-sm:pr-20">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
