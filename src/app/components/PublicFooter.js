"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Phone, Mail, MapPin, Share2 } from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { useAuthStore } from "@/app/store/crisisStore";
import { siteInfo } from "@/lib/siteInfo";
import { typography } from "@/lib/designSystem";
import { usePublicVisibility } from "@/lib/usePublicVisibility";
import { useInstalledApp } from "@/lib/useInstalledApp";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const { user } = useAuthStore();
  const visibility = usePublicVisibility();
  const installedApp = useInstalledApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const showResponderPortal = mounted && user?.role === "admin";

  if (installedApp) {
    return (
      <footer data-public-footer className="relative z-10 shrink-0 border-t border-zinc-200 bg-white text-zinc-700">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1.5 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-xs font-medium leading-snug text-zinc-600">{siteInfo.address}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold">
            <a href={`tel:${siteInfo.phoneTourismTel}`} className="text-zinc-800 hover:text-blue-600">
              Tourism {siteInfo.phoneTourism}
            </a>
            <a href={`tel:${siteInfo.phoneTourismAltTel}`} className="text-zinc-800 hover:text-blue-600">
              {siteInfo.phoneTourismAlt}
            </a>
            <a href={`mailto:${siteInfo.emailTourism}`} className="text-zinc-800 hover:text-blue-600">
              {siteInfo.emailTourism}
            </a>
            <a href={siteInfo.facebook} target="_blank" rel="noreferrer" className="text-zinc-800 hover:text-blue-600">
              {siteInfo.facebookHandle}
            </a>
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <Link href="/about" className="hover:text-blue-600">About</Link>
            <Link href="/faq" className="hover:text-blue-600">FAQ</Link>
            <Link href="/contact" className="hover:text-blue-600">Contact</Link>
            <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
            <span className="font-bold normal-case tracking-normal">
              © {currentYear} {siteInfo.officeName}
            </span>
            {showResponderPortal ? (
              <Link href="/admin" className="text-blue-600">Responder portal</Link>
            ) : null}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer data-public-footer className="relative z-10 shrink-0 border-t border-zinc-200 bg-white text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10 lg:px-8">
        <div className="space-y-5 md:hidden">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={36} className="h-9 w-9" />
            <div className="min-w-0">
              <p className={`${typography.brand} truncate text-zinc-900`}>{siteInfo.brandName}</p>
              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-zinc-500">{siteInfo.officeName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs font-medium">
            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Services</h3>
              <ul className="space-y-1.5">
                <li><Link href="/crisis" className="text-zinc-600 hover:text-blue-600">Crisis Hub</Link></li>
                {visibility.roadsAndHazards ? (
                  <li><Link href="/routes" className="text-zinc-600 hover:text-blue-600">Roads & Travel</Link></li>
                ) : null}
                <li><Link href="/crisis/reports" className="text-zinc-600 hover:text-blue-600">My Reports</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">About</h3>
              <ul className="space-y-1.5">
                <li><Link href="/about" className="text-zinc-600 hover:text-blue-600">About</Link></li>
                <li><Link href="/faq" className="text-zinc-600 hover:text-blue-600">FAQ</Link></li>
                <li><Link href="/contact" className="text-zinc-600 hover:text-blue-600">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Emergency</h3>
            <ul className="space-y-2 text-xs font-medium text-zinc-600">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-blue-600" />
                <span className="leading-snug">{siteInfo.address}</span>
              </li>
              <li><a href={`tel:${siteInfo.phoneTourismTel}`} className="hover:text-blue-600">{siteInfo.phoneTourism} — Tourism</a></li>
              <li><a href={`tel:${siteInfo.phoneTourismAltTel}`} className="hover:text-blue-600">{siteInfo.phoneTourismAlt} — Tourism</a></li>
              <li><a href={siteInfo.facebook} target="_blank" rel="noreferrer" className="hover:text-blue-600">{siteInfo.facebookHandle}</a></li>
            </ul>
          </div>
        </div>

        <div className="hidden gap-x-4 gap-y-4 md:grid md:grid-cols-2 lg:grid-cols-5 lg:gap-10">
          <div className="col-span-2 space-y-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <BrandLogo size={44} className="h-11 w-11" />
              <span className={`${typography.brand} text-zinc-900`}>{siteInfo.brandName}</span>
            </div>
            <p className="max-w-sm text-sm font-medium leading-relaxed text-zinc-500">
              <span className="mb-1 block font-bold uppercase tracking-wide text-zinc-900">{siteInfo.officeName}</span>
              {siteInfo.tagline}
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Crisis Services</h3>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link href="/crisis" className="text-zinc-600 transition-colors hover:text-blue-600">Crisis Hub</Link></li>
              <li><Link href="/crisis/resolved" className="text-zinc-600 transition-colors hover:text-blue-600">Resolved Alerts</Link></li>
              {visibility.roadsAndHazards ? (
                <li><Link href="/routes" className="text-zinc-600 transition-colors hover:text-blue-600">Roads & Travel</Link></li>
              ) : null}
              <li><Link href="/crisis/reports" className="text-zinc-600 transition-colors hover:text-blue-600">My Reports</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">About</h3>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link href="/about" className="text-zinc-600 transition-colors hover:text-blue-600">About the System</Link></li>
              <li><Link href="/faq" className="text-zinc-600 transition-colors hover:text-blue-600">FAQs</Link></li>
              <li><Link href="/contact" className="text-zinc-600 transition-colors hover:text-blue-600">Contact</Link></li>
              <li><Link href="/privacy" className="text-zinc-600 transition-colors hover:text-blue-600">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-zinc-600 transition-colors hover:text-blue-600">Terms of Service</Link></li>
            </ul>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Emergency Contacts</h3>
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 shrink-0 text-blue-600" />
                <span className="leading-snug text-zinc-600">{siteInfo.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="shrink-0 text-blue-600" />
                <a href={`tel:${siteInfo.phoneMunicipalTel}`} className="text-zinc-600 transition-colors hover:text-blue-600">{siteInfo.phoneMunicipal} Municipal Hotline</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="shrink-0 text-blue-600" />
                <a href={`tel:${siteInfo.phoneTourismTel}`} className="text-zinc-600 transition-colors hover:text-blue-600">{siteInfo.phoneTourism} Tourism Office</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="shrink-0 text-blue-600" />
                <a href={`tel:${siteInfo.phoneTourismAltTel}`} className="text-zinc-600 transition-colors hover:text-blue-600">{siteInfo.phoneTourismAlt} Tourism Office</a>
              </li>
              <li className="flex items-center gap-3">
                <Share2 size={16} className="shrink-0 text-blue-600" />
                <a href={siteInfo.facebook} target="_blank" rel="noreferrer" className="text-zinc-600 transition-colors hover:text-blue-600">{siteInfo.facebookHandle}</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="shrink-0 text-blue-600" />
                <a href="tel:117" className="text-zinc-600 transition-colors hover:text-blue-600">117 PNP</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="shrink-0 text-blue-600" />
                <a href={`mailto:${siteInfo.emailTourism}`} className="truncate text-zinc-600 transition-colors hover:text-blue-600">{siteInfo.emailTourism}</a>
              </li>
              {showResponderPortal ? (
                <li className="pt-1">
                  <Link href="/admin" className="inline-block rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-bold text-blue-600 transition-all hover:bg-zinc-100">
                    Responder Portal
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3 border-t border-zinc-200 pt-4 md:mt-10 md:flex-row md:items-center md:justify-between md:pt-6">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 md:text-left">
            &copy; {currentYear} {siteInfo.officeName}
            <span className="mx-2 text-zinc-300">·</span>
            Version {siteInfo.version}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
            <Link href="/privacy" className="transition-colors hover:text-blue-600">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-blue-600">Terms</Link>
            <Link href="/contact" className="transition-colors hover:text-blue-600">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
