"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Coins,
  FileText,
  Loader2,
  Map,
  MessageSquare,
  Phone,
  ShieldAlert,
  Siren,
  UserRound,
} from "lucide-react";
import { InfoPageHero, PublicPageContent, PublicPageShell, PublicPanel } from "@/app/components/InfoPageHero";
import { ErrorState } from "@/app/components/ui/AsyncState";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { notifyRewardEarned } from "@/lib/rewardFeedback";
import { portalShell } from "@/lib/designSystem";

/** Guests (and anyone not signed in as a tourist): the five things to know, no account needed. */
const GUEST_SECTIONS = [
  {
    id: "safe",
    icon: ShieldAlert,
    title: "1. Check if Daet is safe",
    summary: "The coloured bar at the top of Alerts tells you in one line.",
    steps: [
      "Green means no active alerts. Yellow or orange means take care in the named areas. Red means a critical alert: tap it to see what to do.",
      "Open Alerts for the full list and the map. Past alerts has the ones already cleared.",
    ],
    href: "/crisis",
    action: "Open Alerts",
  },
  {
    id: "roads",
    icon: Map,
    title: "2. Check roads before you go",
    summary: "Closed roads, detours and places to avoid, on one map.",
    steps: ["Open Roads & Hazards in the menu.", "Tap a road or pin to read the details."],
    href: "/routes",
    action: "Open Roads & Hazards",
  },
  {
    id: "report",
    icon: FileText,
    title: "3. Report a problem, no account needed",
    summary: "Tell the Tourism Office what happened and how to reach you.",
    steps: [
      "Tap Report a problem in the menu.",
      "Add your name, a mobile number or email, what happened and where. Tap My location to fill in the place.",
    ],
    href: "/crisis/report",
    action: "Report a problem",
  },
  {
    id: "emergency",
    icon: Siren,
    title: "4. In an emergency, call first",
    summary: "The red Emergency button at the bottom right of every page has every hotline.",
    steps: ["If someone is in danger, call 911 right away.", "Then report it here when you are safe."],
    href: "tel:911",
    action: "Call 911",
  },
  {
    id: "account",
    icon: Bell,
    title: "5. Get alerts on your phone",
    summary: "A free account sends alerts by SMS, email and the app, and lets you follow your reports.",
    steps: ["Tap Register and fill in your details.", "In your Profile, choose SMS, email or app alerts."],
    href: "/register",
    action: "Create an account",
    guestOnly: true,
  },
];

const GUIDE_SECTIONS = [
  {
    id: "alerts",
    icon: Bell,
    title: "View crisis alerts and advisories",
    summary: "Check official updates before and during your visit.",
    steps: [
      "Open Alerts to see current public alerts, their affected locations, and safety instructions.",
      "Open an alert for its full details. Check its status and date for the latest information.",
    ],
    href: "/crisis",
    action: "Open Alerts",
  },
  {
    id: "maps",
    icon: Map,
    title: "Read hazard maps and route advisories",
    summary: "Use the map and route list together when planning where to go.",
    steps: [
      "Open Roads & Hazards to view published routes and area hazards.",
      "Select a route or hazard to see its status, affected place, dates, and safety instructions. Follow official detours and avoid closed areas.",
    ],
    href: "/routes",
    action: "Open Roads & Hazards",
  },
  {
    id: "reports",
    icon: FileText,
    title: "Report a problem and follow it",
    summary: "Report a safety concern and keep its reference number for follow-up.",
    steps: [
      "Open Reports and choose Report a problem. Add a clear description and location.",
      "Use the report list to search, filter, and check the current status. Select a report's Details action to see its information and status history.",
    ],
    href: "/crisis/reports",
    action: "Open Reports",
  },
  {
    id: "feedback",
    icon: MessageSquare,
    title: "Send comments, feedback, or suggestions",
    summary: "Share information about public safety and crisis alerts.",
    steps: [
      "Open Feedback from the account menu.",
      "Choose a message type and submit your note. The office reviews it before anyone else can see it.",
    ],
    href: "/crisis/feedback",
    action: "Open Crisis Feedback",
  },
  {
    id: "assistance",
    icon: UserRound,
    title: "Ask a guide for help",
    summary: "When enabled, your home page has an Ask a guide for help section.",
    steps: [
      "On your home page, tap Ask a guide for help.",
      "Choose a request type, provide the destination, and add any useful details. Requests depend on guide availability and Tourism Office coordination; this is not an emergency service.",
    ],
    href: "/#guide-assistance",
    action: "Open Tourist Dashboard",
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Receive notifications",
    summary: "Choose the channels available to your account and device.",
    steps: [
      "Open Profile to manage email, SMS, and in-app preferences. Crisis broadcast email is controlled by the Tourism Office for each alert; browser push is a separate device setting.",
      "Open Notifications to read alerts and updates sent to your account. Browser push can be enabled in Profile on supported devices.",
    ],
    href: "/notifications",
    action: "Open Notifications",
  },
  {
    id: "points",
    icon: Coins,
    title: "View points and transaction history",
    summary: "Your Profile shows a placeholder balance and recorded point activity. Points are not redeemable or connected to the main wallet.",
    steps: [
      "Open Profile and find My Points to see your current balance.",
      "Choose View Points History to see recorded rewards, deductions, dates, and statuses where available. This is a placeholder balance only; points cannot be redeemed and are not connected to the main wallet.",
    ],
    href: "/profile",
    action: "Open Profile",
  },
];

export default function HowToUsePage() {
  const { user, isAuthenticated } = useAuthStore();
  const [completion, setCompletion] = useState({
    loading: true,
    completed: false,
    rewardEnabled: false,
    rewardAwarded: false,
    completedAt: null,
    pointsAwarded: 0,
  });
  const [completionError, setCompletionError] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionRetry, setCompletionRetry] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "tourist") {
      setCompletion((current) => ({ ...current, loading: false }));
      return undefined;
    }

    let active = true;
    (async () => {
      try {
        const session = await getActiveSession();
        if (!session?.access_token) throw new Error("Sign in again to check guide completion.");
        const response = await fetch("/api/tourist/guide-completion", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Unable to check guide completion.");
        if (active) {
          setCompletion({ loading: false, ...result });
          setCompletionError(null);
        }
      } catch (error) {
        if (active) {
          setCompletion((current) => ({ ...current, loading: false }));
          setCompletionError(error.message || "Unable to check guide completion.");
        }
      }
    })();

    return () => { active = false; };
  }, [isAuthenticated, user?.id, user?.role, completionRetry]);

  const markCompleted = async () => {
    if (completionLoading || completion.completed) return;
    setCompletionLoading(true);
    setCompletionError(null);
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Sign in again to complete the guide.");
      const response = await fetch("/api/tourist/guide-completion", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to complete the guide.");
      setCompletion((current) => ({ ...current, ...result, loading: false }));
      if (result.status === "awarded" && result.rewardAwarded) {
        notifyRewardEarned(result.pointsAwarded, `tourist-guide-completion:${user.id}`);
      }
    } catch (error) {
      setCompletionError(error.message || "Unable to complete the guide.");
    } finally {
      setCompletionLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== "tourist") {
    const sections = GUEST_SECTIONS.filter((section) => !section.guestOnly || !isAuthenticated);
    return (
      <PublicPageShell>
        <InfoPageHero title="How to Use CONNECT-DAET" description="Five things to know. No account needed." />
        <PublicPageContent>
          <PublicPanel title="Start here" subtitle="Each step has a button that takes you there.">
            <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
              {sections.map(({ id, icon: Icon, title, summary, steps, href, action }) => (
                <section key={id} id={id} className="grid gap-3 p-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start sm:gap-4">
                  <Icon size={20} className={id === "emergency" ? "text-red-600" : "text-blue-700"} aria-hidden />
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-zinc-900">{title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">{summary}</p>
                    <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-700 marker:font-bold marker:text-zinc-400">
                      {steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                  </div>
                  {href.startsWith("tel:") ? (
                    <a href={href} className={`${portalShell.btnGhost} w-fit text-red-700 sm:mt-0.5`}>
                      <Phone size={14} /> {action}
                    </a>
                  ) : (
                    <Link href={href} className={`${portalShell.btnGhost} w-fit sm:mt-0.5`}>
                      {action} <ChevronRight size={14} />
                    </Link>
                  )}
                </section>
              ))}
            </div>
          </PublicPanel>
          {!isAuthenticated ? (
            <p className="text-xs font-medium text-zinc-500">
              Already have a tourist account? <Link href="/login" className="font-bold text-blue-600 hover:underline">Sign in</Link> for the full tourist guide.
            </p>
          ) : null}
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <InfoPageHero
        title="How to Use CONNECT-DAET"
        description="A step-by-step guide to alerts, routes, reports, assistance, notifications, and points."
      />
      <PublicPageContent>
        <PublicPanel
          title="Start here"
          subtitle="Use the links below to open each service. Skipping this guide does not mark it complete or award points."
          action={<Link href="/profile" className={portalShell.btnGhost}>Skip guide <ChevronRight size={14} /></Link>}
        >
          <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
            {GUIDE_SECTIONS.map(({ id, icon: Icon, title, summary, steps, href, action }) => (
              <section key={id} id={id} className="grid gap-3 p-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start sm:gap-4">
                <Icon size={20} className="text-blue-700" aria-hidden />
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-zinc-900">{title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600">{summary}</p>
                  {id === "assistance" ? (
                    <p className="mt-2 text-xs font-semibold text-amber-800">
                      If the request option is not shown on your dashboard, guide help is turned off for now.
                    </p>
                  ) : null}
                  <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-700 marker:font-bold marker:text-zinc-400">
                    {steps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </div>
                <Link href={href} className={`${portalShell.btnGhost} w-fit sm:mt-0.5`}>
                  {action} <ChevronRight size={14} />
                </Link>
              </section>
            ))}
          </div>
        </PublicPanel>

        <PublicPanel title="Complete this guide" subtitle="Completion is recorded once for your account. The optional reward is exactly 10 points and is controlled by the Tourism Office." bodyClassName="bg-blue-50/30">
          {completionError ? (
            <ErrorState
              title="Could not update guide completion"
              message={completionError}
              onRetry={() => {
                setCompletion((current) => ({ ...current, loading: true }));
                setCompletionError(null);
                setCompletionRetry((retry) => retry + 1);
              }}
            />
          ) : completion.loading ? (
            <p role="status" className="flex items-center gap-2 text-sm font-medium text-zinc-500">
              <Loader2 size={16} className="animate-spin" /> Checking completion status...
            </p>
          ) : completion.completed ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-700" />
              <div>
                <p className="text-sm font-bold text-zinc-900">Guide completed</p>
                <p className="mt-1 text-xs text-zinc-600">
                  {completion.rewardAwarded
                    ? `Your one-time ${completion.pointsAwarded || 10}-point reward is recorded in your placeholder balance. Points are not redeemable or connected to the main wallet.`
                    : "Your completion is saved. No reward was recorded for this completion."}
                  {completion.completedAt ? ` Completed ${new Date(completion.completedAt).toLocaleDateString()}.` : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
                After you have reviewed the sections, mark this guide complete. You can also skip it and return later.
                {completion.rewardEnabled ? " The first completion earns exactly 10 points." : " The optional points reward is currently disabled."}
              </p>
              <button
                type="button"
                onClick={markCompleted}
                disabled={completionLoading}
                className={`${portalShell.btnPrimary} min-h-11 shrink-0 disabled:opacity-60`}
              >
                {completionLoading ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={15} /> Mark as Completed</>}
              </button>
            </div>
          )}
        </PublicPanel>
      </PublicPageContent>
    </PublicPageShell>
  );
}