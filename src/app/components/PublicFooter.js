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

  const showResponderPortal = mounted && user?.role === "admin";

  return (
    <footer data-public-footer className="relative z-10 bg-white text-zinc-900 border-t border-zinc-200 shrink-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Mobile: compact stacked layout */}
        <div className="md:hidden space-y-5">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={36} className="h-9 w-9" />
            <div className="min-w-0">
              <p className={`${typography.brand} text-zinc-900 truncate`}>{siteInfo.brandName}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 truncate">{siteInfo.officeName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs font-medium">
            <div>
              <h3 className="font-bold text-[10px] uppercase tracking-[0.18em] mb-2 text-zinc-400">Services</h3>
              <ul className="space-y-1.5">
                <li><Link href="/crisis" className="text-zinc-600 hover:text-blue-600">Crisis Hub</Link></li>
                <li><Link href="/routes" className="text-zinc-600 hover:text-blue-600">Roads & Travel</Link></li>
                <li><Link href="/crisis/reports" className="text-zinc-600 hover:text-blue-600">My Reports</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-[10px] uppercase tracking-[0.18em] mb-2 text-zinc-400">About</h3>
              <ul className="space-y-1.5">
                <li><Link href="/about" className="text-zinc-600 hover:text-blue-600">About</Link></li>
                <li><Link href="/faq" className="text-zinc-600 hover:text-blue-600">FAQ</Link></li>
                <li><Link href="/contact" className="text-zinc-600 hover:text-blue-600">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-[10px] uppercase tracking-[0.18em] mb-2 text-zinc-400">Emergency</h3>
            <ul className="space-y-2 text-xs font-medium text-zinc-600">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-blue-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{siteInfo.address}</span>
              </li>
              <li><a href="tel:911" className="hover:text-blue-600">911 — National Emergency</a></li>
              <li><a href={`tel:${siteInfo.phoneTourismTel}`} className="hover:text-blue-600">{siteInfo.phoneTourism} — Tourism</a></li>
            </ul>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-4 lg:gap-10">
          <div className="col-span-2 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <BrandLogo size={44} className="h-11 w-11" />
              <span className={`${typography.brand} text-zinc-900`}>{siteInfo.brandName}</span>
            </div>
            <p className="text-sm text-zinc-500 max-w-sm leading-relaxed font-medium">
              <span className="block font-bold uppercase tracking-wide text-zinc-900 mb-1">{siteInfo.officeName}</span>
              {siteInfo.tagline}
            </p>
          </div>
          <div>
            <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] mb-4 text-zinc-400">Crisis Services</h3>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link href="/crisis" className="text-zinc-600 hover:text-blue-600 transition-colors">Crisis Hub</Link></li>
              <li><Link href="/crisis/resolved" className="text-zinc-600 hover:text-blue-600 transition-colors">Resolved Alerts</Link></li>
              <li><Link href="/routes" className="text-zinc-600 hover:text-blue-600 transition-colors">Roads & Travel</Link></li>
              <li><Link href="/crisis/reports" className="text-zinc-600 hover:text-blue-600 transition-colors">My Reports</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] mb-4 text-zinc-400">About</h3>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link href="/about" className="text-zinc-600 hover:text-blue-600 transition-colors">About the System</Link></li>
              <li><Link href="/faq" className="text-zinc-600 hover:text-blue-600 transition-colors">FAQs</Link></li>
              <li><Link href="/contact" className="text-zinc-600 hover:text-blue-600 transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="text-zinc-600 hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-zinc-600 hover:text-blue-600 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] mb-4 text-zinc-400">Emergency Contacts</h3>
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span className="text-zinc-600 leading-snug">{siteInfo.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-blue-600 shrink-0" />
                <a href={`tel:${siteInfo.phoneMunicipalTel}`} className="text-zinc-600 hover:text-blue-600 transition-colors">{siteInfo.phoneMunicipal} Municipal Hotline</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-blue-600 shrink-0" />
                <a href={`tel:${siteInfo.phoneTourismTel}`} className="text-zinc-600 hover:text-blue-600 transition-colors">{siteInfo.phoneTourism} Tourism Office</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-blue-600 shrink-0" />
                <a href="tel:911" className="text-zinc-600 hover:text-blue-600 transition-colors">911 National Emergency</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-blue-600 shrink-0" />
                <a href="tel:117" className="text-zinc-600 hover:text-blue-600 transition-colors">117 PNP</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-blue-600 shrink-0" />
                <a href={`mailto:${siteInfo.emailTourism}`} className="text-zinc-600 hover:text-blue-600 transition-colors truncate">{siteInfo.emailTourism}</a>
              </li>
              {showResponderPortal && (
                <li className="pt-1">
                  <Link href="/admin" className="inline-block bg-zinc-50 border border-zinc-200 px-4 py-2 rounded-xl font-bold text-blue-600 hover:bg-zinc-100 transition-all text-xs">
                    Responder Portal
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-200 mt-5 md:mt-10 pt-4 md:pt-6 flex flex-col items-center gap-3 md:flex-row md:justify-between md:items-center">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center md:text-left">
            &copy; {currentYear} {siteInfo.officeName}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
