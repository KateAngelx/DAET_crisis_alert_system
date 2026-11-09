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
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { InfoPageHero, PublicPageContent, PublicPageShell, PublicPanel } from "@/app/components/InfoPageHero";
import { ErrorState } from "@/app/components/ui/AsyncState";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { notifyRewardEarned } from "@/lib/rewardFeedback";
import { portalShell } from "@/lib/designSystem";

const GUIDE_SECTIONS = [
  {
    id: "alerts",
    icon: Bell,
    title: "View crisis alerts and advisories",
    summary: "Check official updates before and during your visit.",
    steps: [
      "Open Crisis Hub to see current public alerts, their affected locations, and safety instructions.",
      "Open an alert for its full details. Check its status and date for the latest information.",
    ],
    href: "/crisis",
    action: "Open Crisis Hub",
  },
  {
    id: "maps",
    icon: Map,
    title: "Read hazard maps and route advisories",
    summary: "Use the map and route list together when planning where to go.",
    steps: [
      "Open Roads & Travel to view published routes and area hazards.",
      "Select a route or hazard to see its status, affected place, dates, and safety instructions. Follow official detours and avoid closed areas.",
    ],
    href: "/routes",
    action: "Open Roads & Travel",
  },
  {
    id: "reports",
    icon: FileText,
    title: "Submit and track incident reports",
    summary: "Report a safety concern and keep its reference number for follow-up.",
    steps: [
      "Open My Reports and choose Report an incident. Add a clear description and location.",
      "Use the report list to search, filter, and check the current status. Select a report's Details action to see its information and status history.",
    ],
    href: "/crisis/reports",
    action: "Open My Reports",
  },
  {
    id: "feedback",
    icon: MessageSquare,
    title: "Send comments, feedback, or suggestions",
    summary: "Share information about public safety and crisis alerts.",
    steps: [
      "Open Crisis Feedback from Crisis Hub or the CONNECT-DAET menu.",
      "Choose a message type and submit your note. Submissions may be reviewed before they are shown publicly.",
    ],
    href: "/crisis/feedback",
    action: "Open Crisis Feedback",
  },
  {
    id: "assistance",
    icon: UserRound,
    title: "Request Tourist Guide Assistance",
    summary: "When enabled, the Tourist Dashboard has a Tourist Guide Assistance section.",
    steps: [
      "Open the Tourist Dashboard and select Request Guide Assistance in that section.",
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
      "Open Profile to manage SMS and in-app notification preferences.",
      "Open Notifications to read alerts and updates sent to your account. Browser push can be enabled in Profile on supported devices.",
    ],
    href: "/notifications",
    action: "Open Notifications",
  },
  {
    id: "points",
    icon: Coins,
    title: "View points and transaction history",
    summary: "Your Profile shows your balance and recorded point activity.",
    steps: [
      "Open Profile and find My Points to see your current balance.",
      "Choose View Points History to see recorded rewards, deductions, dates, and statuses where available.",
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
    return (
      <PublicPageShell>
        <InfoPageHero title="How to Use CONNECT-DAET" description="A simple guide for registered tourists." />
        <PublicPageContent>
          <PublicPanel title="Tourist account required">
            <p className="text-sm font-medium text-zinc-600">Sign in with a registered tourist account to use this guide and mark it complete.</p>
            <Link href="/login" className={`mt-4 ${portalShell.btnPrimary}`}>Sign in</Link>
          </PublicPanel>
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
                      If the request option is not shown on your dashboard, Tourist Guide Assistance is currently disabled.
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
                    ? `Your one-time ${completion.pointsAwarded || 10}-point reward is recorded in My Points.`
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