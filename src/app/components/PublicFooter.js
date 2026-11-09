"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/app/store/crisisStore";
import { siteInfo } from "@/lib/siteInfo";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const showResponderPortal = mounted && user?.role === "admin";

  return (
    <footer data-public-footer className="relative z-10 shrink-0 border-t border-zinc-200 bg-white text-zinc-700">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-1.5 px-4 py-3 sm:px-6 lg:px-8">
        <p className="text-xs font-medium leading-snug text-zinc-600">{siteInfo.address}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold">
          <a href="tel:911" className="text-red-600 hover:underline">911</a>
          <a href={`tel:${siteInfo.phoneTourismTel}`} className="text-zinc-800 hover:text-blue-600">
            Tourism {siteInfo.phoneTourism}
          </a>
          <a href={`mailto:${siteInfo.emailTourism}`} className="text-zinc-800 hover:text-blue-600">
            {siteInfo.emailTourism}
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
