# CONNECT-DAET

Tourism crisis communication and emergency alerts for **Daet, Camarines Norte** — operated by the Daet Municipal Tourism Office. Tourists and guides get official alerts, road and hazard advisories, and incident reporting; administrators publish broadcasts and manage response from the Command Center.

## Features

- **Crisis Hub** — Live alerts, maps, and safety instructions
- **Roads & Travel** — Route advisories and area hazards
- **Incident reports** — Submit and track reports (registered users)
- **Tourist Guide Assistance** — Registered tourists can request destination help; administrators select a guide, and guides accept or decline
- **Command Center** — Create, broadcast, and resolve alerts (admin)
- **Notifications** — In-app, email, SMS (Semaphore), and optional mobile/desktop Web Push
- **Offline** — The latest public alerts, area hazards and road advisories are saved on the phone. Without internet the app shows the saved copy and an emergency page (`/~offline`) with tap-to-call hotlines. The service worker runs in production builds only (`npm run build && npm start`), not in `npm run dev`.
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
SMS_PRIMARY_PROVIDER=semaphore
SEMAPHORE_API_KEY=
SEMAPHORE_SENDER_NAME=
IPROG_SMS_API_TOKEN=
# IPROG_SMS_API_URL= (optional)
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS= EMAIL_FROM=
# or RESEND_API_KEY= and EMAIL_FROM=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:admin@example.com
```

SMS tries the provider selected by `SMS_PRIMARY_PROVIDER` first (`semaphore` by default), then automatically falls back to the other provider if the request fails. Set both `SEMAPHORE_API_KEY` and `IPROG_SMS_API_TOKEN` to enable failover. Set `SMS_PRIMARY_PROVIDER=iprog` to make iProg primary and Semaphore the backup. A provider accepting a message means it has queued it; it does not guarantee delivery. If a provider queues a message but its response times out, the fallback may send a duplicate.

Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Keep `VAPID_PRIVATE_KEY` server-side; never expose it with a `NEXT_PUBLIC_` prefix. Push notifications require HTTPS (except localhost), browser permission, and the user's opt-in in Profile settings. Desktop banners follow browser and operating-system notification settings.

For local development, put the generated pair in `.env.local` and set `WEB_PUSH_SUBJECT` to a monitored contact such as `mailto:admin@example.com`. In production, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `WEB_PUSH_SUBJECT` in the server's environment, then restart the app. Do not generate a different VAPID pair for each deployment; existing subscriptions are bound to the public key. If the pair must be rotated, tourists need to re-enable push on each device.

Android browsers need an installed/active service worker and notification permission. On iPhone or iPad, use iOS/iPadOS 16.4 or newer, add the site to the Home Screen, open that web app, then grant notification permission and enable push in Profile. Banner visibility, vibration, and sound are controlled by browser and device settings; Web Push cannot force a sound when the device suppresses it.

To verify delivery, enable push on a supported HTTPS device, confirm Profile says it is enabled on that device, then trigger a real notification event for that account while the app is backgrounded. Check the device banner and server delivery result. A successful subscription alone does not prove message delivery.

See `.env.local` comments or Admin → Settings for SMS/email testing.

### Database

Run SQL files in `supabase/migrations/` **in numeric order** in the Supabase SQL Editor.
Tourist Guide Assistance uses migrations `035_tourist_guide_assistance_requests.sql` and `036_tourist_guide_assistance_workflow.sql`; apply both before enabling the feature in Admin Settings.
Alert targeting ("Who gets notified": everyone, tourists in Daet now, or tourists near the alert area) and tourist visit dates in Profile use migration `048_alert_targeting_visit_dates.sql`; until it is applied, every alert goes to everyone as before.
Automatic escalation of unanswered urgent reports (need-help/missing check-ins, missing-person cases, Critical incident reports, guide emergency reports) uses migration `055_urgent_escalation.sql` and the `/api/cron/escalations` job (every 5 minutes in GitHub Actions). Configure minutes and outside contacts in Admin -> Settings -> Escalation. Each alert window also has a Delivery report with "Resend SMS to non-responders" (no migration needed).
Chat on incident reports (reporter, guides involved and administrators; live updates; read-only after Closed or Rejected) uses migration `054_incident_messages.sql`, which also adds the table to Supabase Realtime.
Missing-tourist reports (tagging, last seen place and time, photo, Command Center "Missing persons" list, "I am safe" banner for the tagged tourist) use migration `053_missing_person_cases.sql`; before it is applied the report is still sent, without the case details.
"Not affected - dismiss" on Low, Medium and High alert notices uses migration `052_notification_dismissals.sql`; Critical notices cannot be dismissed. Dismissed notices are under the Dismissed tab of the Notifications page.
Tours cannot start in the past (Philippine time) after migration `051_tour_start_not_in_past.sql`; tours that already started keep their start date. Tour end reminders go to the guide (in-app, email, SMS) and to the group`s tourists (in-app).
"I am safe / I need help" check-ins and the guide headcount use migration `050_crisis_alert_checkins.sql`. Turn on "Ask tourists if they are safe" when sending an alert; "Need help" and "Missing" answers alert every administrator (in-app, SMS, email) and the tourist`s guide at once.
Opt-in tourist location sharing and the "Within a distance of the alert pin" option use migration `049_tourist_location_sharing.sql` (apply after 048). Positions are rounded to about 100 m, stored in their own table that only the tourist and the server can read, and deleted after 48 hours by the hourly expire-advisories job.
Crisis alert update history and the required All Clear message use migration `047_crisis_alert_updates.sql`. After it is applied, every alert edit is recorded and shown on the alert, and an alert can only be resolved with an All Clear message.
Spam limits on public forms (sign-up, password reset, feedback, guest reports, account deletion) are shared across server instances using migration `046_shared_rate_limits.sql`; until it is applied, each server instance keeps its own count as before.
Walk-in (no account) incident reports at `/crisis/report` use migration `045_guest_incident_reports.sql`; until it is applied, the guest form shows a "not set up yet" message and asks people to call the hotlines.
Guide emergency reporting uses migration `037_guide_emergency_reports.sql`; apply it to enable direct emergency reporting from the Guide Dashboard and review in the Crisis Command Center.
Web Push subscriptions and notification event de-duplication use migration `038_web_push_subscriptions.sql`; apply it before enabling push notifications. Apply `041_web_push_per_device_registration.sql` and `042_web_push_account_devices.sql` so each browser keeps its own subscription and one account can receive the same alert on every device that enabled push. In Vercel, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `WEB_PUSH_SUBJECT` for Production, then redeploy. Use the same key pair already used by existing devices. Profile names any missing variable and does not show key values.

### Scheduled jobs

Every job endpoint accepts `GET` or `POST` with `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret: <CRON_SECRET>`).

| Job | Endpoint | Runs from | Schedule |
| --- | --- | --- | --- |
| Pause SMS after 30 days inactive | `/api/cron/inactive-users` | Vercel (`vercel.json`) | Daily, 02:00 PHT |
| Expire road and area advisories | `/api/cron/expire-advisories` | GitHub Actions, plus a daily Vercel backup | Hourly |
| Guide tour end reminders (1 hour before and at end time) | `/api/cron/tour-end-reminders` | GitHub Actions | Every 5 minutes |
| Send queued SMS and email (retries, leftovers from large broadcasts) | `POST /api/notifications/process-queue` | GitHub Actions | Every 5 minutes |

Broadcasts send every queued message right away, up to about 45 seconds of work. Anything left after that, failed sends waiting for a retry, and messages left stuck by an interrupted request are sent by the 5-minute queue job. A message is retried up to 3 times; one not sent within 12 hours is cancelled as out of date. Critical and High priority messages go first.

The Vercel Hobby plan only allows daily cron jobs, so the jobs that run more often use the GitHub Actions workflow in `.github/workflows/scheduled-jobs.yml`.

Setup:

1. In Vercel, set `CRON_SECRET` for Production and redeploy. Vercel sends it automatically to the jobs in `vercel.json`. `NOTIFICATION_INTERNAL_SECRET` alone is not enough, because Vercel only sends `CRON_SECRET`.
2. In GitHub, open the repo → Settings → Secrets and variables → Actions. Add the secret `CRON_SECRET` (the same value) and the variable `APP_URL` (the production URL, no trailing slash).
3. Open the Actions tab → **Scheduled jobs** → **Run workflow** to test it once. Each step should finish green.

GitHub may start scheduled runs several minutes late, and it pauses schedules in a public repo after 60 days with no commits; re-enable the workflow in the Actions tab if that happens. If you move to Vercel Pro, you can move all three schedules into `vercel.json` instead.

Tour end-time reminders require migration `044_tour_group_end_time_reminders.sql`. Email follows each guide's notification preference. Date-only tours receive the due reminder at the end of the selected date, while the 1-hour reminder requires an end time. Tour groups remain active until the guide manually marks them done.

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
