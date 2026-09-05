export const ROLES = {
  ADMIN: 'admin',
  TOURIST: 'tourist',
  GUIDE: 'guide',
};

export const INCIDENT_CATEGORIES = [
  'Accident',
  'Medical Emergency',
  'Natural Disaster',
  'Missing Person',
  'Fire',
  'Crime/Security Concern',
  'Road/Transportation Problem',
  'Tourist Assistance',
  'Weather-Related Incident',
  'Other',
];

export const INCIDENT_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

export const INCIDENT_STATUSES = [
  'Submitted',
  'Received',
  'Under Review',
  'Assigned',
  'Responding',
  'Resolved',
  'Closed',
  'Rejected',
];

export const NOTIFICATION_PRIORITIES = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export const NOTIFICATION_CHANNELS = {
  WEB: 'web',
  EMAIL: 'email',
  SMS: 'sms',
};

export const DELIVERY_STATUSES = [
  'pending',
  'processing',
  'sent',
  'delivered',
  'failed',
  'retrying',
  'cancelled',
];

export const REGISTRATION_STATUSES = ['pending', 'approved', 'rejected', 'active', 'completed'];

export const TOURIST_STATUSES = ['registered', 'on_tour', 'checked_in', 'emergency', 'completed'];

export const EMERGENCY_FALLBACK = {
  title: 'Important: This app does not replace emergency services',
  message:
    'In a life-threatening emergency, call 911 or 117 immediately. This app provides official Daet LGU crisis updates and report tracking. It requires internet access and does not dispatch emergency responders.',
  hotlines: [
    { name: 'National Emergency Hotline', number: '911' },
    { name: 'PNP', number: '117' },
    { name: 'BFP', number: '160' },
    { name: 'DOH', number: '1555' },
    { name: 'Red Cross', number: '143' },
  ],
};

export function severityToPriority(severity) {
  const map = { Low: 'LOW', Medium: 'NORMAL', High: 'HIGH', Critical: 'CRITICAL' };
  return map[severity] || 'NORMAL';
}

export function getStatusColor(status) {
  const colors = {
    Submitted: 'bg-blue-100 text-blue-700',
    Received: 'bg-indigo-100 text-indigo-700',
    'Under Review': 'bg-yellow-100 text-yellow-700',
    Assigned: 'bg-purple-100 text-purple-700',
    Responding: 'bg-orange-100 text-orange-700',
    Resolved: 'bg-green-100 text-green-700',
    Closed: 'bg-gray-100 text-gray-700',
    Rejected: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getSeverityColor(severity) {
  const colors = {
    Low: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    High: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
  };
  return colors[severity] || 'bg-gray-100 text-gray-700';
}
