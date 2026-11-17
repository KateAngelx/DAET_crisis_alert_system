import React from "react";
import { SectionTabs } from "@/app/components/shell/SectionTabs";
import { FEATURE_NAMES } from "@/lib/featureNames";

const GROUP_TABS = [
  { key: "groups", label: "Groups", href: "/guide/groups" },
  { key: "tourists", label: "Tourists & invites", href: "/guide/tourists" },
];

const ALERT_TABS = [
  { key: "alerts", label: FEATURE_NAMES.alerts, href: "/guide/crisis" },
  { key: "roads", label: FEATURE_NAMES.roads, href: "/guide/routes" },
];

/** Guide menu item Groups = two tabs: the groups, and the tourists you invite to them. */
export function GuideGroupTabs({ active }) {
  return <SectionTabs tabs={GROUP_TABS} active={active} label="Groups" />;
}

/** Guide menu item Alerts = two tabs: alerts, and roads & hazards. */
export function GuideAlertTabs({ active }) {
  return <SectionTabs tabs={ALERT_TABS} active={active} label="Alerts" />;
}
