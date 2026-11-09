# CONNECT-DAET

Tourism crisis communication and emergency alerts for **Daet, Camarines Norte** — operated by the Daet Municipal Tourism Office. Tourists and guides get official alerts, road and hazard advisories, and incident reporting; administrators publish broadcasts and manage response from the Command Center.

## Features

- **Crisis Hub** — Live alerts, maps, and safety instructions
- **Roads & Travel** — Route advisories and area hazards
- **Incident reports** — Submit and track reports (registered users)
- **Tourist Guide Assistance** — Registered tourists can request destination help; administrators select a guide, and guides accept or decline
- **Command Center** — Create, broadcast, and resolve alerts (admin)
- **Notifications** — In-app, email, SMS (iProg), and optional mobile/desktop Web Push
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
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:admin@example.com
```

Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Keep `VAPID_PRIVATE_KEY` server-side; never expose it with a `NEXT_PUBLIC_` prefix. Push notifications require HTTPS (except localhost), browser permission, and the user's opt-in in Profile settings. Desktop banners follow browser and operating-system notification settings.

For local development, put the generated pair in `.env.local` and set `WEB_PUSH_SUBJECT` to a monitored contact such as `mailto:admin@example.com`. In production, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `WEB_PUSH_SUBJECT` in the server's environment, then restart the app. Do not generate a different VAPID pair for each deployment; existing subscriptions are bound to the public key. If the pair must be rotated, tourists need to re-enable push on each device.

Android browsers need an installed/active service worker and notification permission. On iPhone or iPad, use iOS/iPadOS 16.4 or newer, add the site to the Home Screen, open that web app, then grant notification permission and enable push in Profile. Banner visibility, vibration, and sound are controlled by browser and device settings; Web Push cannot force a sound when the device suppresses it.

To verify delivery, enable push on a supported HTTPS device, confirm Profile says it is enabled on that device, then trigger a real notification event for that account while the app is backgrounded. Check the device banner and server delivery result. A successful subscription alone does not prove message delivery.

See `.env.local` comments or Admin → Settings for SMS/email testing.

### Database

Run SQL files in `supabase/migrations/` **in numeric order** in the Supabase SQL Editor.
Tourist Guide Assistance uses migrations `035_tourist_guide_assistance_requests.sql` and `036_tourist_guide_assistance_workflow.sql`; apply both before enabling the feature in Admin Settings.
Guide emergency reporting uses migration `037_guide_emergency_reports.sql`; apply it to enable direct emergency reporting from the Guide Dashboard and review in the Crisis Command Center.
Web Push subscriptions and notification event de-duplication use migration `038_web_push_subscriptions.sql`; apply it before enabling push notifications. Apply `041_web_push_per_device_registration.sql` to update per-device re-registration behavior.

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
| Admin | `/admin`, `/crisis/admin`, `/crisis/admin/routes`, `/admin/incidents`, `/admin/guide-assistance`, `/admin/users`, `/admin/activity`, `/admin/settings` |
| Guide | `/guide`, `/guide/crisis`, `/guide/routes`, `/guide/groups`, `/guide/assistance`, `/guide/reports`, `/guide/tourists` |

## Emergency

For immediate danger, call **911** or **117** before using the app.
