"use client";

import React, { useState } from "react";
import Link from "next/link";
import { InfoPageHero, PublicPageShell, PublicPageContent, PublicInfoCallout } from "@/app/components/InfoPageHero";
import { ChevronDown } from "lucide-react";
import { siteInfo } from "@/lib/siteInfo";

const faqs = [
  {
    q: `What is ${siteInfo.brandName}?`,
    a: `It is the official crisis alert platform of the ${siteInfo.officeName}. It publishes alerts with crisis type, severity, affected location, and safety instructions. Registered users can also submit incident reports and track response status.`,
  },
  {
    q: "Do I need an account to view alerts?",
    a: "No. Active alerts are visible on the Crisis Hub and Advisories pages without logging in. Registering lets you receive notifications and submit incident reports.",
  },
  {
    q: "How do I receive emergency notifications?",
    a: `Create an account with a valid email and phone number. When the ${siteInfo.officeName} issues an alert, notifications are sent through the channels selected for that alert (app, email, and/or SMS).`,
  },
  {
    q: "How do I report an emergency or incident?",
    a: "Open My Reports, tap Report an Incident, and complete the form with category, severity, location, and description. Track response status on the same page.",
  },
  {
    q: "Does this app replace calling 911 or 117?",
    a: "No. Call 911 or 117 (PNP) immediately if you are in immediate danger. This system provides official crisis updates and report tracking — it does not dispatch emergency responders.",
  },
  {
    q: "What information does each alert include?",
    a: "Each alert shows the crisis type (e.g. Weather, Health, Security), severity level (Low to Critical), affected location, time issued, official message with safety instructions, and current status (Active or Resolved).",
  },
  {
    q: "How do user roles work?",
    a: `New registrations are assigned the tourist role by default. Tourism guide and administrator roles are assigned by ${siteInfo.officeName} staff. Guides can monitor assigned tourists; admins can issue alerts and manage reports.`,
  },
  {
    q: "Who can access the admin portal and Command Center?",
    a: `Only users with the administrator role assigned by ${siteInfo.officeName} staff. Tourists and guides cannot access admin features.`,
  },
  {
    q: "Is my personal information secure?",
    a: "Your data is used only for crisis alerts, incident reports, and account management. See the Privacy Policy for details on how information is stored and handled.",
  },
  {
    q: "What should I do during a Critical alert?",
    a: "Read the alert message carefully. Follow the listed safety instructions, avoid named affected areas, and call 911 or 117 if you need immediate help. Continue checking the Crisis Hub for status updates until the alert is marked Resolved.",
  },
  {
    q: "How can tourism guides use this system?",
    a: `Guides can view active alerts, check on assigned tourists, and review incident reports linked to their group. Contact the ${siteInfo.officeName} to be assigned the guide role.`,
  },
];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-zinc-50 transition-colors"
      >
        <span className="font-bold text-sm text-zinc-900">{question}</span>
        <ChevronDown size={18} className={`text-blue-600 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-zinc-600 font-medium leading-relaxed border-t border-zinc-100 pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <PublicPageShell>
      <InfoPageHero
        title="Frequently Asked Questions"
        description={`How to read alerts, report incidents, and use the ${siteInfo.officeName} crisis alert system.`}
      />

      <PublicPageContent>
        <div className="space-y-3 mb-10">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
          ))}
        </div>

        <PublicInfoCallout variant="zinc" label="Emergency Contacts" className="mt-12">
          <p className="text-sm text-zinc-600 font-medium mb-4">
            For immediate danger: call <strong>911</strong> or <strong>117</strong>. For non-emergency support, contact the {siteInfo.officeName} at{" "}
            <a href={`mailto:${siteInfo.emailTourism}`} className="text-blue-600 font-bold hover:underline">{siteInfo.emailTourism}</a>{" "}
            or <a href={`tel:${siteInfo.phoneTourismTel}`} className="text-blue-600 font-bold hover:underline">{siteInfo.phoneTourism}</a>.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 text-blue-600 font-black uppercase text-xs tracking-widest hover:underline">
            Go to Contact
          </Link>
        </PublicInfoCallout>
      </PublicPageContent>
    </PublicPageShell>
  );
}
