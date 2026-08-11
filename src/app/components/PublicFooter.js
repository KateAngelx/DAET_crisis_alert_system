"use client";

import React from "react";
import Link from "next/link";
import { Zap, Phone, Mail, MapPin } from "lucide-react";

/**
 * PublicFooter Component
 * Aligned with unified UI system and Next.js standards.
 */
export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          
          {/* Brand & Mission */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 rounded-lg size-9 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Zap size={22} className="text-white" fill="white" />
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase">
                CONNECT-DAET
              </span>
            </div>
            <p className="text-sm text-zinc-400 max-w-xs leading-relaxed font-medium">
              The official Smart Tourism & Crisis Management Platform for Daet, Camarines Norte. 
              Bridging technology and tradition for a safer travel experience.
            </p>
          </div>

          {/* Quick Navigation */}
          <div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-6 text-zinc-500">
              Navigation
            </h3>
            <ul className="space-y-4 text-sm font-bold">
              <li><Link href="/" className="text-zinc-400 hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/info" className="text-zinc-400 hover:text-white transition-colors">Information</Link></li>
              <li><Link href="/museum" className="text-zinc-400 hover:text-white transition-colors">Museo Bulawan</Link></li>
              <li><Link href="/events" className="text-zinc-400 hover:text-white transition-colors">Events</Link></li>
              <li>
                <Link href="/crisis" className="text-red-500 hover:text-red-400 transition-colors flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  Live Crisis Alerts
                </Link>
              </li>
            </ul>
          </div>

          {/* Tourism Services */}
          <div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-6 text-zinc-500">
              Services
            </h3>
            <ul className="space-y-4 text-sm font-bold">
              <li><Link href="/arvr" className="text-zinc-400 hover:text-white transition-colors">AR/VR Tours</Link></li>
              <li><Link href="/shop" className="text-zinc-400 hover:text-white transition-colors">Souvenir Shop</Link></li>
              <li><Link href="/tours" className="text-zinc-400 hover:text-white transition-colors">Guided Tours</Link></li>
              <li><Link href="/rewards" className="text-zinc-400 hover:text-white transition-colors">Tourist Rewards</Link></li>
              <li><Link href="/admin" className="text-blue-500 hover:text-blue-400 transition-colors italic">Staff Portal</Link></li>
            </ul>
          </div>

          {/* Contacts Section */}
          <div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-6 text-zinc-500">
              Get in Touch
            </h3>
            <ul className="space-y-4 text-sm font-bold">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-blue-500 shrink-0" />
                <span className="text-zinc-400 leading-snug">Municipal Hall, Daet, Camarines Norte</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-blue-500 shrink-0" />
                <a href="tel:+63544401234" className="text-zinc-400 hover:text-white transition-colors">(054) 440-1234</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-blue-500 shrink-0" />
                <a href="mailto:support@connect-daet.ai" className="text-zinc-400 hover:text-white transition-colors truncate">support@connect-daet.ai</a>
              </li>
              <li className="pt-2">
                <Link href="/feedback" className="inline-block bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-blue-400 hover:bg-zinc-800 transition-all">
                   Report an Issue
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            &copy; {currentYear} CONNECT-DAET.ai • System 6 Prototype
          </p>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">LGU Guidelines</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}