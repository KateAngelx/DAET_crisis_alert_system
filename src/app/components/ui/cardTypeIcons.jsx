import {
  Activity,
  Ban,
  CarFront,
  CircleCheck,
  ClipboardList,
  CloudLightning,
  Coins,
  Construction,
  Flame,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Mountain,
  TrafficCone,
  TriangleAlert,
  UserSearch,
  Users,
  Waves,
  Wind,
  AlertTriangle,
  Bell,
  Info,
  CheckCircle2,
  Route,
  ShieldAlert,
  AlertOctagon,
  HeartPulse,
} from "lucide-react";
import { createElement } from "react";
import { alertTypeIconName, hazardTypeIconName, notificationIconName, roadStatusIconName } from "@/lib/typeIcons";

/** lucide icons by name, for the shared type-icon rules in lib/typeIcons.js. */
export const TYPE_ICON_COMPONENTS = {
  Activity, Ban, Bell, MessageSquare, CarFront, CircleCheck, ClipboardList, CloudLightning, Coins, Construction, Flame,
  HeartPulse, LifeBuoy, Megaphone, Mountain, Route, ShieldAlert, TrafficCone, TriangleAlert, UserSearch, Users, Waves, Wind,
};

function iconFor(name, fallback = Bell) {
  return TYPE_ICON_COMPONENTS[name] || fallback;
}

const ALERT_SEVERITY_ICONS = {
  Critical: AlertTriangle,
  High: AlertTriangle,
  Medium: Bell,
  Low: Info,
};

const ROUTE_STATUS_ICONS = {
  safe: CheckCircle2,
  caution: AlertTriangle,
  unsafe: Ban,
};

const ROUTE_ADVISORY_ICONS = {
  Safe: CheckCircle2,
  Caution: AlertTriangle,
  Closed: Ban,
};

const DANGER_SEVERITY_ICONS = {
  Critical: AlertOctagon,
  Dangerous: AlertOctagon,
  Caution: ShieldAlert,
};

export function AlertSeverityIcon({ severity, size = 18 }) {
  const Icon = ALERT_SEVERITY_ICONS[severity] || Bell;
  return <Icon size={size} strokeWidth={2.25} />;
}

// Icons are picked from a fixed list (never created during render), so createElement is used
// instead of a capitalised JSX variable.
const iconProps = (size, className) => ({ size, strokeWidth: 2.25, className, "aria-hidden": "true" });

export function AlertTypeIcon({ type, size = 18, className }) {
  return createElement(iconFor(alertTypeIconName(type), Megaphone), iconProps(size, className));
}

export function HazardTypeIcon({ type, size = 18, className }) {
  return createElement(iconFor(hazardTypeIconName(type), TriangleAlert), iconProps(size, className));
}

export function RoadStatusTypeIcon({ status, size = 18, className }) {
  return createElement(iconFor(roadStatusIconName(status), Route), iconProps(size, className));
}

/** The icon for an in-app notice (alert type, hazard type, road status, resolved, reward …). */
export function getNotificationIconComponent(notification) {
  return iconFor(notificationIconName(notification), Bell);
}

/** Renders the icon for an in-app notice. */
export function NotificationTypeIcon({ notification, size = 16, className }) {
  return createElement(getNotificationIconComponent(notification), iconProps(size, className));
}

export function RouteStatusIcon({ status, size = 18 }) {
  const Icon = ROUTE_STATUS_ICONS[status] || Route;
  return <Icon size={size} strokeWidth={2.25} />;
}

export function RouteAdvisoryIcon({ routeStatus, size = 18 }) {
  const Icon = ROUTE_ADVISORY_ICONS[routeStatus] || Route;
  return <Icon size={size} strokeWidth={2.25} />;
}

export function DangerSeverityIcon({ severity, size = 18 }) {
  const Icon = DANGER_SEVERITY_ICONS[severity] || ShieldAlert;
  return <Icon size={size} strokeWidth={2.25} />;
}
