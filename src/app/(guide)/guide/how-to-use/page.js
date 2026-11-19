import Link from "next/link";
import { BellRing, ChevronRight, ClipboardCheck, Compass, FileText, History, LifeBuoy, Siren, Users } from "lucide-react";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { guideShell } from "@/lib/designSystem";

export const metadata = { title: "How to Use — Guide | CONNECT-DAET" };

const SECTIONS = [
  {
    icon: BellRing,
    title: "Start on Today",
    steps: [
      "Needs you now lists what to do first: help requests waiting for you, missing tourists, tourists not checked in during an alert, and tours past their end date.",
      "The coloured bar at the top tells you if Daet is safe right now.",
    ],
    href: "/guide",
    action: "Open Today",
  },
  {
    icon: Compass,
    title: "Make a tour group",
    steps: [
      "Open Groups and tap New tour group. Add the route, dates and meeting place.",
      "Start dates cannot be in the past. You get a reminder when the planned end time passes.",
    ],
    href: "/guide/groups",
    action: "Open Groups",
  },
  {
    icon: Users,
    title: "Invite tourists",
    steps: [
      "In Groups, open the Tourists & invites tab and find the tourist by name.",
      "They join your group after they accept. Their phone is shown to you only then.",
    ],
    href: "/guide/tourists",
    action: "Open Tourists & invites",
  },
  {
    icon: LifeBuoy,
    title: "Answer help requests",
    steps: [
      "When the Tourism Office assigns you a tourist's request, it shows in Help requests and on Today.",
      "Accept or decline it. The tourist sees your phone after you accept.",
    ],
    href: "/guide/assistance",
    action: "Open Help requests",
  },
  {
    icon: ClipboardCheck,
    title: "Check in your tourists during an alert",
    steps: [
      "Some alerts ask everyone to check in. Open Alerts and mark each tourist: safe, evacuated, needs help or missing.",
      "Needs help and missing go straight to the Tourism Office.",
    ],
    href: "/guide/crisis",
    action: "Open Alerts",
  },
  {
    icon: Siren,
    title: "In an emergency",
    steps: [
      "Tap the red Emergency button at the bottom right. Call 911 first if anyone is in danger.",
      "Use Emergency Report on Today for urgent office alerts. After you submit, open Today and scroll to Your recent emergency reports for status and Office update notes.",
      "Report a problem in Reports is for non-emergency follow-up you can track with the office.",
    ],
    href: "/guide/reports",
    action: "Open Reports",
  },
  {
    icon: History,
    title: "Finish a tour",
    steps: ["When the group is back safely, mark the tour done in Groups.", "Finished tours, closed reports and past alerts are in Past tours under More."],
    href: "/guide/history",
    action: "Open Past tours",
  },
];

export default function GuideHowToUsePage() {
  return (
    <>
      <GuidePageHeader title="How to Use" description="Seven short steps for guides. Each one has a button that takes you there." />
      <GuidePanel title="Guide steps">
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {SECTIONS.map(({ icon: Icon, title, steps, href, action }, index) => (
            <section key={title} className="grid gap-3 p-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start sm:gap-4">
              <Icon size={20} className={index === 5 ? "text-red-600" : "text-purple-700"} aria-hidden />
              <div className="min-w-0">
                <h2 className="text-sm font-black text-zinc-900">{index + 1}. {title}</h2>
                <ol className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-700">
                  {steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </div>
              <Link href={href} className={`${guideShell.btnGuide} w-fit no-underline`}>
                {action} <ChevronRight size={14} />
              </Link>
            </section>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs font-medium text-zinc-500">
          <FileText size={14} /> More questions? See the <Link href="/faq" className="font-bold text-blue-600 hover:underline">FAQs</Link>.
        </p>
      </GuidePanel>
    </>
  );
}
