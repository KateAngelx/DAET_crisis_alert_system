import React from "react";
import { SectionTabs } from "@/app/components/shell/SectionTabs";
import { FEATURE_NAMES } from "@/lib/featureNames";

const TABS = [
  { key: "active", label: "Active", href: "/crisis" },
  { key: "past", label: FEATURE_NAMES.pastAlerts, href: "/crisis/resolved" },
];

/** Active and past alerts are one place: two tabs on the Alerts page. */
export function AlertsTabs({ active = "active" }) {
  return <SectionTabs tabs={TABS} active={active} label="Alerts" />;
}
