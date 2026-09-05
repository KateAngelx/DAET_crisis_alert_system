import Link from "next/link";
import { Zap, Phone, Mail, MapPin } from "lucide-react";
import { typography, iconSize } from "@/lib/designSystem";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 rounded-lg size-9 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Zap size={iconSize.brand} className="text-white" fill="white" />
              </div>
              <span className={typography.brand}>CONNECT-DAET</span>
            </div>
            <p className="text-sm text-zinc-400 max-w-sm leading-relaxed font-medium">
              Official crisis alerts and incident reporting for Daet, Camarines Norte. View active alerts, affected areas, safety instructions, and emergency contact information.
            </p>
          </div>

          <div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-6 text-zinc-500">Crisis Services</h3>
            <ul className="space-y-4 text-sm font-bold">
              <li><Link href="/crisis" className="text-zinc-400 hover:text-white transition-colors">Crisis Hub</Link></li>
              <li><Link href="/crisis/alerts" className="text-zinc-400 hover:text-white transition-colors">Safety Advisories</Link></li>
              <li><Link href="/crisis/reports" className="text-zinc-400 hover:text-white transition-colors">My Reports</Link></li>
              <li>
                <Link href="/crisis/alerts" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2">
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
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-6 text-zinc-500">About</h3>
            <ul className="space-y-4 text-sm font-bold">
              <li><Link href="/about" className="text-zinc-400 hover:text-white transition-colors">About the System</Link></li>
              <li><Link href="/faq" className="text-zinc-400 hover:text-white transition-colors">FAQs</Link></li>
              <li><Link href="/contact" className="text-zinc-400 hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-6 text-zinc-500">Emergency Contacts</h3>
            <ul className="space-y-4 text-sm font-bold">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-blue-500 shrink-0" />
                <span className="text-zinc-400 leading-snug">Municipal Hall, Daet, Camarines Norte</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-blue-500 shrink-0" />
                <a href="tel:911" className="text-zinc-400 hover:text-white transition-colors">911 — National Emergency</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-blue-500 shrink-0" />
                <a href="tel:117" className="text-zinc-400 hover:text-white transition-colors">117 — PNP</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-blue-500 shrink-0" />
                <a href="mailto:crisis@connect-daet.ai" className="text-zinc-400 hover:text-white transition-colors truncate">crisis@connect-daet.ai</a>
              </li>
              <li className="pt-2">
                <Link href="/admin" className="inline-block bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-blue-400 hover:bg-zinc-800 transition-all">
                  Responder Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            &copy; {currentYear} CONNECT-DAET — Daet LGU Crisis Alert System
          </p>
          <div className="flex flex-wrap gap-6 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
