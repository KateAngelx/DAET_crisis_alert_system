# CONNECT-DAET

Tourism crisis communication and emergency alerts for **Daet, Camarines Norte** — operated by the Daet Municipal Tourism Office. Tourists and guides get official alerts, road and hazard advisories, and incident reporting; administrators publish broadcasts and manage response from the Command Center.

## Features

- **Crisis Hub** — Live alerts, maps, and safety instructions
- **Roads & Travel** — Route advisories and area hazards
- **Incident reports** — Submit and track reports (registered users)
- **Command Center** — Create, broadcast, and resolve alerts (admin)
- **Notifications** — In-app, email, and SMS (iProg) where configured
- **Roles** — Tourist, guide, and admin access

## Tech stack

Next.js 16 · React 19 · Tailwind CSS 4 · Supabase · Zustand

## Getting started

**Prerequisites:** Node.js 18+, Supabase project with migrations applied.

1. Copy environment variables into `.env.local` (see below).
2. `npm install` then `npm run dev` — open [http://localhost:3000](http://localhost:3000).
3. For production, deploy to [Vercel](https://vercel.com), add the same env vars, and redeploy after changes to `NEXT_PUBLIC_*`.

### Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Optional (notifications & cron)

```
NOTIFICATION_INTERNAL_SECRET=
CRON_SECRET=
IPROG_SMS_API_TOKEN=
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS= EMAIL_FROM=
# or RESEND_API_KEY= and EMAIL_FROM=
```

See `.env.local` comments or Admin → Settings for SMS/email testing.

### Database

Run SQL files in `supabase/migrations/` **in numeric order** in the Supabase SQL Editor.

Optional daily cron:

- `POST /api/cron/inactive-users` — header `x-cron-secret: <CRON_SECRET>` (SMS pause after 30 days inactive)
- `GET /api/cron/expire-advisories` — header `Authorization: Bearer <CRON_SECRET>`

### User roles

| Role | How assigned | Access |
|------|----------------|--------|
| `tourist` | Self-registration | Crisis Hub, routes, reports, notifications |
| `guide` | Admin in Supabase | Guide dashboard, groups, reports |
| `admin` | Admin in Supabase | Dashboard, Command Center, incidents, users |

```sql
UPDATE profiles SET user_type = 'admin' WHERE email = 'user@example.com';
UPDATE profiles SET user_type = 'guide' WHERE email = 'user@example.com';
```

## Main routes

| Area | Paths |
|------|--------|
| Public | `/`, `/crisis`, `/routes`, `/crisis/reports`, `/notifications`, `/profile` |
| Admin | `/admin`, `/crisis/admin`, `/crisis/admin/routes`, `/admin/incidents`, `/admin/users`, `/admin/activity`, `/admin/settings` |
| Guide | `/guide`, `/guide/crisis`, `/guide/routes`, `/guide/groups`, `/guide/reports`, `/guide/tourists` |

## Emergency

For immediate danger, call **911** or **117** before using the app.
