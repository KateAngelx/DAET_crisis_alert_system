/** Informational copy tailored per role / surface */

export const ROLE_INTERFACE = {
  public: {
    crisisHub: {
      title: "Crisis Hub",
      description:
        "Official LGU emergency alerts for Daet. Check severity, affected areas, and instructions before you travel.",
      helper:
        "For road closures and detours, use Roads & Travel. This page is for weather, health, security, and other emergencies.",
    },
    routes: {
      title: "Roads & Travel Advisories",
      description:
        "Route status, recommended detours, and area hazards published by Daet LGU — on one map.",
      helper: "Lines follow drivable roads. Pins mark places to avoid or use with caution.",
    },
    reports: {
      title: "My Reports",
      description: "Submit and track incident reports you filed with Daet LGU.",
      helper: "For life-threatening emergencies, call 911 or 117 first, then report here if safe to do so.",
    },
  },
  guide: {
    dashboard: {
      title: "Guide Dashboard",
      description: "Your tour operations at a glance — groups, tourists, and what needs attention.",
      helper: "Use Crisis Hub for LGU alerts affecting your groups. Use Roads & Travel for route and hazard details.",
    },
    crisis: {
      title: "Crisis Hub",
      description: "LGU emergency alerts plus how they relate to your active tour groups.",
      helper: "Share relevant alerts with tourists in the field. Critical items should be communicated immediately.",
    },
    routes: {
      title: "Roads & Travel",
      description: "Route advisories and area hazards — filtered to paths your groups use.",
      helper: "Matches the public travel map. Prioritize closed routes and area hazards before departures.",
    },
    reports: {
      title: "Group Reports",
      description: "Incident reports linked to tourists in your assigned groups.",
      helper: "Escalate Critical or High severity items to LGU admins through your normal channels.",
    },
  },
  admin: {
    dashboard: {
      title: "Admin Dashboard",
      description: "System overview — users, incidents, active hazards, and pipeline status.",
      helper: "Broadcast emergencies in Command Center. Manage routes and area pins under Roads & Hazards.",
    },
    commandCenter: {
      title: "Crisis Command Center",
      description: "Issue and monitor emergency alerts for Daet. Broadcast via app, email, and SMS.",
      helper: "Resolve alerts when the situation is contained. Travel updates belong in Roads & Hazards.",
    },
    roadsHazards: {
      title: "Roads & Hazards",
      description: "Publish route lines (safe, caution, closed, detours) and point-in-area hazard warnings.",
      helper: "Routes tab = road segments. Area Hazards tab = beaches, landmarks, or places tourists should avoid.",
    },
    incidents: {
      title: "Incident Reports",
      description: "Review, assign, and respond to tourist and staff incident submissions.",
      helper: "Update status so reporters receive notifications. Critical reports need fastest response.",
    },
    users: {
      title: "User Management",
      description: "Monitor registrations, online activity, and inactive accounts. Create, edit, deactivate, or delete users.",
      helper: "Users inactive 30+ days have SMS paused until they sign in again and re-enable it. Inactive notices are sent in-app and by email when RESEND_API_KEY is configured.",
    },
    workflow: {
      title: "Alert Pipeline",
      description: "Track how alerts are issued, delivered, and resolved across the Daet crisis system.",
      helper: "Use Command Center to publish alerts. This view shows pipeline health — not individual road advisories.",
    },
    settings: {
      title: "System Settings",
      description: "Configure notification audience, exports, and LGU-wide delivery rules.",
      helper: "Crisis alert emails are sent to all registered tourists with an email on file when Email is enabled on the broadcast. SMS and in-app still follow user preferences.",
    },
  },
};
