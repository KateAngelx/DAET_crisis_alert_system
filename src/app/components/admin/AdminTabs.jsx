import React from "react";
import { SectionTabs } from "@/app/components/shell/SectionTabs";

const PEOPLE_TABS = [
  { key: "users", label: "Users", href: "/admin/users" },
  { key: "guides", label: "Guide monitoring", href: "/admin/guides" },
];

const HISTORY_TABS = [
  { key: "archive", label: "Archive", href: "/admin/archive" },
  { key: "activity", label: "Activity log", href: "/admin/activity" },
  { key: "feedback", label: "Feedback", href: "/admin/crisis-feedback" },
];

/** Admin menu item People = Users | Guide monitoring. */
export function AdminPeopleTabs({ active }) {
  return <SectionTabs tabs={PEOPLE_TABS} active={active} label="People" />;
}

/** Admin menu item History = Archive | Activity log | Feedback. */
export function AdminHistoryTabs({ active }) {
  return <SectionTabs tabs={HISTORY_TABS} active={active} label="History" />;
}
