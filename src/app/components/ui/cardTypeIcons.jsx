import {
  AlertTriangle,
  Bell,
  Info,
  CheckCircle2,
  Ban,
  Route,
  ShieldAlert,
  AlertOctagon,
} from "lucide-react";

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
