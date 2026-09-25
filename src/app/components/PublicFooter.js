"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Phone, Mail, MapPin } from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { useAuthStore } from "@/app/store/crisisStore";
import { siteInfo } from "@/lib/siteInfo";
import { typography } from "@/lib/designSystem";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
  }, [mounted, user]);

  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;
    const id = requestAnimationFrame(() => {
      const pulse = document.querySelector("section[aria-label='Live platform activity']");
      const footer = document.querySelector("[data-public-footer]");
      const pulseStyle = pulse ? getComputedStyle(pulse) : null;
      const footerStyle = footer ? getComputedStyle(footer) : null;
      const pulseRect = pulse?.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();
      const overlapPx =
        pulseRect && footerRect ? Math.round(pulseRect.bottom - footerRect.top) : null;
    });
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  const showResponderPortal = mounted && user?.role === "admin";

  return (
    <footer data-public-footer className="relative z-10 bg-zinc-950 text-white border-t border-white/5 shrink-0 pb-24 sm:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <BrandLogo size={44} />
              <span className={`${typography.brand} text-white`}>{siteInfo.brandName}</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm leading-relaxed font-medium">
              <span className="block font-black uppercase tracking-wide text-zinc-300 mb-1">{siteInfo.officeName}</span>
              {siteInfo.tagline}
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
                <span className="text-zinc-400 leading-snug text-xs sm:text-sm">{siteInfo.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-blue-500 shrink-0" />
                <a href={`tel:${siteInfo.phoneMunicipalTel}`} className="text-zinc-400 hover:text-white transition-colors">{siteInfo.phoneMunicipal} — Municipal Hotline</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-blue-500 shrink-0" />
                <a href={`tel:${siteInfo.phoneTourismTel}`} className="text-zinc-400 hover:text-white transition-colors">{siteInfo.phoneTourism} — Tourism Office</a>
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
                <a href={`mailto:${siteInfo.emailTourism}`} className="text-zinc-400 hover:text-white transition-colors truncate text-xs sm:text-sm">{siteInfo.emailTourism}</a>
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
            &copy; {currentYear} {siteInfo.officeName}
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
