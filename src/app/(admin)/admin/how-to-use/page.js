import Link from "next/link";
import { BarChart3, ChevronRight, FileWarning, History, LifeBuoy, Radio, Route, Settings, ShieldAlert, Users } from "lucide-react";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { AdminPanel } from "@/app/components/admin/AdminPanel";

export const metadata = { title: "How to Use — Admin | CONNECT-DAET" };

const SECTIONS = [
  {
    icon: ShieldAlert,
    title: "Start on the Dashboard",
    steps: [
      "Needs action lists what to do first: missing tourists not acknowledged, escalated reports, new reports, help requests waiting, and alerts whose texts failed.",
      "Red rows are the most urgent.",
    ],
    href: "/admin",
    action: "Open Dashboard",
  },
  {
    icon: Radio,
    title: "Send an alert",
    steps: [
      "Tap Send alert. Pick the type and severity, write what happened and what people should do.",
      "Severity: Critical reaches everyone on every channel, even if they turned a channel off. Use it only when lives are at risk.",
      "Targeting: send to everyone, to tourists in Daet now, to those near a map pin, or to tour groups at a named place.",
      "Tick Ask for check-in when you need to know who is safe. Replies appear on the alert.",
    ],
    href: "/crisis/command",
    action: "Open Alerts",
  },
  {
    icon: BarChart3,
    title: "Check who got the alert",
    steps: [
      "Open the alert, then Delivery report: who opened it, who got the SMS or email, and who replied.",
      "Resend reminds only the people who have not opened or answered.",
    ],
    href: "/crisis/command",
    action: "Open Alerts",
  },
  {
    icon: FileWarning,
    title: "Handle reports",
    steps: [
      "Open Reports, review each new report and set its status. The reporter is told each time.",
      "Use the chat inside a report to talk with the tourist and their guide.",
    ],
    href: "/admin/incidents",
    action: "Open Reports",
  },
  {
    icon: LifeBuoy,
    title: "Assign help requests",
    steps: ["Open Help requests and assign a guide. The guide accepts or declines; you see the result there."],
    href: "/admin/guide-assistance",
    action: "Open Help requests",
  },
  {
    icon: Route,
    title: "Publish roads and hazards",
    steps: ["Open Roads & Hazards. Routes are roads (open, caution, closed, detour); Area Hazards are places to avoid."],
    href: "/crisis/roads",
    action: "Open Roads & Hazards",
  },
  {
    icon: Settings,
    title: "Set up escalation",
    steps: [
      "Escalation: if nobody acknowledges an urgent report or missing tourist in time, all admins are alerted again by SMS and in the app, then once more after twice that time.",
      "Set the waiting time in Settings, Escalation. Nothing is sent outside the Tourism Office.",
    ],
    href: "/admin/settings",
    action: "Open Settings",
  },
  {
    icon: Users,
    title: "People and records",
    steps: ["People has users and guide monitoring. History has the archive, the activity log and tourist feedback."],
    href: "/admin/users",
    action: "Open People",
  },
];

export default function AdminHowToUsePage() {
  return (
    <>
      <DashboardPageHeader
        title="How to Use"
        description="Eight short steps for the Tourism Office. Each one has a button that takes you there."
        action={
          <Link href="/admin/settings" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-widest text-zinc-700 hover:bg-zinc-50">
            Back to Settings
          </Link>
        }
      />
      <AdminPanel title="Admin steps">
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {SECTIONS.map(({ icon: Icon, title, steps, href, action }, index) => (
            <section key={title} className="grid gap-3 p-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start sm:gap-4">
              <Icon size={20} className={index === 1 ? "text-red-600" : "text-blue-700"} aria-hidden />
              <div className="min-w-0">
                <h2 className="text-sm font-black text-zinc-900">{index + 1}. {title}</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-700">
                  {steps.map((step) => <li key={step}>{step}</li>)}
                </ul>
              </div>
              <Link
                href={href}
                className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-widest text-blue-700 hover:bg-blue-50"
              >
                {action} <ChevronRight size={14} />
              </Link>
            </section>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs font-medium text-zinc-500">
          <History size={14} /> Old links (Command Center, Activity Log, Guide Monitoring, Crisis Feedback) still work; they open as tabs.
        </p>
      </AdminPanel>
    </>
  );
}
