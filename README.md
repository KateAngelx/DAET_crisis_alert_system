# CONNECT-DAET — Tourism Crisis Communication & Emergency Alert System

Official emergency communication platform for Daet, Camarines Norte. Provides real-time crisis alerts, safety advisories, incident reporting, and coordination between tourists, tourism personnel, and authorized responders.

## Features

- **Crisis Hub** — Official LGU emergency alerts with affected-area maps and safety instructions
- **Roads & Travel** — Route advisories, detours, and area hazards on one unified map
- **Incident Reporting** — Tourists and staff can submit and track emergency reports
- **Command Center** — Authorized personnel create, manage, and resolve alerts
- **Roads & Hazards (Admin)** — Publish route lines and point-in-area hazard warnings
- **Notifications** — In-app notification system with delivery queue
- **User Management** — Role-based access for admins, tourists, and guides

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Next.js API Routes, Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State:** Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with migrations applied

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # Required for profile creation & role management

# Optional — required for production notification queue processing
NOTIFICATION_INTERNAL_SECRET=your_internal_secret

# Optional — for scheduled advisory expiry (Vercel Cron or external scheduler)
CRON_SECRET=your_cron_secret

# iProg SMS (https://www.iprogsms.com) — crisis alert & hazard SMS delivery
IPROG_SMS_API_TOKEN=your_iprog_api_token_from_dashboard
# SMS_API_URL=https://sms.iprogtech.com/api/v1/sms_messages   # default if omitted
# SMS_PROVIDER=2   # 2 = multi-network provider (recommended)
```

### Deploy to Vercel

1. Push the repo to GitHub and import it in [Vercel](https://vercel.com).
2. In **Project → Settings → Environment Variables**, add the variables from `.env.local`.
3. Enable each variable for **Production**, **Preview**, and **Development**.
4. **Redeploy** after saving env vars (`NEXT_PUBLIC_*` values are embedded at build time).

Without Supabase variables, the crisis hub shows *Could not load alerts* with a configuration error.

### Database Setup

Run migrations in order in the Supabase SQL Editor:

1. `supabase/migrations/001_incident_notification_system.sql`
2. `supabase/migrations/002_profiles_auth_roles.sql`
3. …through `009_notification_auth_rls.sql`
4. `010_crisis_alert_coordinates.sql`
5. `011_dangerous_location_warnings.sql`
6. `012_route_advisories.sql`
7. `013_route_geometry.sql` — road-following route paths (OSRM)
8. `014_unify_area_advisories.sql` — merges area hazards into `route_advisories`
9. `015_user_notification_channels.sql` — user email/SMS/app preferences

### User Roles

| Role | Assignment | Access |
|------|------------|--------|
| `tourist` | Automatic on public registration | Crisis Hub, Roads & Travel, incident reporting, notifications |
| `guide` | Manual in Supabase by administrator | Guide dashboard, group reports, crisis & travel views |
| `admin` | Manual in Supabase by administrator | Full admin panel, Command Center, Roads & Hazards |

**Promote a user in Supabase SQL Editor:**

```sql
UPDATE profiles SET user_type = 'admin' WHERE email = 'user@example.com';
UPDATE profiles SET user_type = 'guide' WHERE email = 'user@example.com';
```

Row Level Security (RLS) enforces these roles at the database level — not just in the UI.

### Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key Routes

### Public

| Route | Description |
|-------|-------------|
| `/` | Public home — crisis communication overview |
| `/crisis` | Crisis Hub — live alerts, safety instructions, map |
| `/routes` | Roads & Travel — route advisories and area hazards |
| `/crisis/report` | Submit an incident report (auth required) |
| `/crisis/reports` | Track your submitted reports (auth required) |
| `/notifications` | User notifications (auth required) |

Legacy redirects: `/crisis/alerts` → `/crisis`, `/crisis/dangerous-locations` → `/routes`

### Admin

| Route | Description |
|-------|-------------|
| `/admin` | Admin dashboard |
| `/crisis/admin` | Crisis Command Center |
| `/crisis/admin/routes` | Roads & Hazards (Routes + Area Hazards tabs) |
| `/admin/incidents` | Incident management |
| `/admin/users` | User management |
| `/admin/workflow` | Alert pipeline overview |

Legacy redirect: `/crisis/admin/dangerous-locations` → `/crisis/admin/routes?tab=areas`

### Guide

| Route | Description |
|-------|-------------|
| `/guide` | Guide dashboard |
| `/guide/crisis` | Crisis Hub (guide context) |
| `/guide/routes` | Roads & Travel (aligned with public map) |
| `/guide/reports` | Group incident reports |
| `/guide/groups` | Tour group management |
| `/guide/tourists` | Active tourists |

Legacy redirect: `/guide/alerts` → `/guide/crisis`

## Scheduled Jobs (Optional)

**Expire stale advisories** — `GET /api/cron/expire-advisories` with header `Authorization: Bearer <CRON_SECRET or NOTIFICATION_INTERNAL_SECRET>`.

Configure in Vercel Cron or an external scheduler to run daily.

## SMS (iProg)

Crisis alerts and area-hazard notifications queue SMS through `notification_deliveries` → `sendSms()` → [iProg SMS API](https://sms.iprogtech.com/api/v1/documentation).

1. Create an account at [iprogsms.com](https://www.iprogsms.com) and buy credits.
2. Copy your **API token** from the iProg dashboard.
3. Set `IPROG_SMS_API_TOKEN` in Vercel / `.env.local`.
4. Ensure user profiles have valid Philippine phone numbers (`09XX…` or `639XX…`).
5. Issue a test alert from Command Center with the **SMS** channel enabled.

Custom sender names (e.g. `CONNECTDAET`) require separate approval in the iProg dashboard; until approved, messages use iProg’s shared sender.

## Emergency Hotlines

In a life-threatening emergency, contact local services immediately:

- **911** — National Emergency Hotline
- **117** — PNP
- **160** — BFP
- **1555** — DOH
- **143** — Red Cross
