# CONNECT-DAET — Tourism Crisis Communication & Emergency Alert System

Official emergency communication platform for Daet, Camarines Norte. Provides real-time crisis alerts, safety advisories, incident reporting, and coordination between tourists, tourism personnel, and authorized responders.

## Features

- **Emergency Alerts** — Real-time crisis broadcasts via app, email, and SMS
- **Public Crisis Hub** — Live safety feed with affected-area maps
- **Incident Reporting** — Tourists and staff can submit and track emergency reports
- **Command Center** — Authorized personnel create, manage, and resolve alerts
- **Notifications** — In-app notification system with delivery queue
- **User Management** — Role-based access for admins, tourists, and guides

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Next.js API Routes, Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State:** Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the migration applied

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # Required for profile creation & role management
```

### Deploy to Vercel

1. Push the repo to GitHub and import it in [Vercel](https://vercel.com).
2. In **Project → Settings → Environment Variables**, add the same three variables from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Enable each variable for **Production**, **Preview**, and **Development**.
4. **Redeploy** after saving env vars (`NEXT_PUBLIC_*` values are embedded at build time).

Without these variables, the crisis hub shows *Could not load alerts* with a Supabase configuration error.

### Database Setup

Run migrations in order:
1. `supabase/migrations/001_incident_notification_system.sql`
2. `supabase/migrations/002_profiles_auth_roles.sql`
3. …through `009_notification_auth_rls.sql`

### User Roles

| Role | Assignment | Access |
|------|------------|--------|
| `tourist` | Automatic on public registration | Alerts, incident reporting, notifications |
| `guide` | Manual in Supabase by administrator | Guide features + assigned tourist visibility |
| `admin` | Manual in Supabase by administrator | Full admin panel, command center, user management |

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

| Route | Description |
|-------|-------------|
| `/` | Public home — crisis communication overview |
| `/crisis` | Public crisis hub with live alerts and map |
| `/crisis/alerts` | Safety advisories feed |
| `/crisis/report` | Submit an incident report (auth required) |
| `/crisis/reports` | Track your submitted reports (auth required) |
| `/notifications` | User notifications (auth required) |
| `/about` | About the system |
| `/faq` | Frequently asked questions |
| `/contact` | Contact and emergency hotlines |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/admin` | Admin dashboard |
| `/crisis/admin` | Crisis command center |
| `/admin/incidents` | Incident management |
| `/admin/users` | User management |
| `/admin/workflow` | Communication pipeline overview |

## Emergency Hotlines

In a life-threatening emergency, contact local services immediately:

- **911** — National Emergency Hotline
- **117** — PNP
- **160** — BFP
- **1555** — DOH
- **143** — Red Cross
