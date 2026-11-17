/** Informational copy tailored per role / surface */

const OFFICE = "Daet Municipal Tourism Office";

export const ROLE_INTERFACE = {
  public: {
    crisisHub: {
      title: "Alerts",
      description:
        `Official emergency alerts from the ${OFFICE}. Check severity, affected areas, and instructions before you travel.`,
      helper:
        "For road closures and detours, open Roads & Hazards. This page is for weather, health, security, and other emergencies.",
    },
    routes: {
      title: "Roads & Hazards",
      description:
        `Route status, recommended detours, and area hazards published by the ${OFFICE} — on one map.`,
      helper: "Lines follow drivable roads. Pins mark places to avoid or use with caution.",
    },
    reports: {
      title: "Reports",
      description: `Send a report to the ${OFFICE} and follow what happens to it.`,
      helper: "For life-threatening emergencies, call 911 or 117 first, then report here if safe to do so.",
    },
    resolvedAlerts: {
      title: "Past alerts",
      description:
        `Past emergency alerts from the ${OFFICE} that have been marked resolved. Active emergencies are on Alerts.`,
      helper:
        `These records show what happened and when the ${OFFICE} cleared the situation. For current threats, open Alerts.`,
    },
  },
  guide: {
    dashboard: {
      title: "Guide Dashboard",
      description: "Your groups, your tourists, and what needs you now.",
      helper: "Open Alerts for tourism office alerts affecting your groups. Open Roads & Hazards for route and hazard details.",
    },
    crisis: {
      title: "Alerts",
      description: "Tourism office emergency alerts plus how they relate to your active tour groups.",
      helper: "Share relevant alerts with tourists in the field. Critical items should be communicated immediately.",
    },
    routes: {
      title: "Roads & Hazards",
      description: "Route advisories and area hazards — filtered to paths your groups use.",
      helper: "Matches the public travel map. Prioritize closed routes and area hazards before departures.",
    },
    reports: {
      title: "Reports",
      description: "Problems reported by you or by tourists in your groups.",
      helper: "Escalate Critical or High severity items to tourism office administrators through your normal channels.",
    },
  },
  admin: {
    dashboard: {
      title: "Admin Dashboard",
      description: "What needs action now, plus users, reports and hazards.",
      helper: "Send emergencies from Alerts. Manage routes and area pins under Roads & Hazards.",
    },
    commandCenter: {
      title: "Alerts",
      description: "Send and follow emergency alerts for Daet, by app, email, and SMS.",
      helper: "Resolve alerts when the situation is contained. Travel updates belong in Roads & Hazards.",
    },
    roadsHazards: {
      title: "Roads & Hazards",
      description: "Publish route lines (safe, caution, closed, detours) and point-in-area hazard warnings.",
      helper: "Routes are roads (open, caution, closed, detour). Area Hazards are places to avoid, like a beach or landmark.",
    },
    incidents: {
      title: "Reports",
      description: "Problems reported by tourists, guides and guests. Review and reply to each one.",
      helper: "Update status so reporters receive notifications. Critical reports need fastest response.",
    },
    users: {
      title: "User Management",
      description: "Monitor registrations, online activity, and inactive accounts. Create users, change roles, or delete users.",
      helper: "Users inactive 30+ days have SMS paused until they sign in again and re-enable it; Critical crisis alerts are still sent by SMS. Inactive notices are sent in-app and by email when RESEND_API_KEY is configured.",
    },
    settings: {
      title: "System Settings",
      description: "Configure notification audience, exports, and office-wide delivery rules.",
      helper: "Crisis alert emails are sent to all registered tourists with an email on file when Email is enabled on the broadcast. SMS and in-app still follow user preferences.",
    },
  },
};
