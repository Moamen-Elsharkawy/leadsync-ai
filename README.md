# SmartFlow Physical Therapy Intake System

SmartFlow is a production-ready MVP for physical therapy centers. Customers send inquiries through Telegram, the AI assistant replies in Arabic, and the center manager reviews intake leads, conversations, follow-ups, and reports from a professional web dashboard.

The demo business is **MoveWell Physical Therapy Centers** with branches in Nasr City, Maadi, and New Cairo.

## What It Does

- Collects physical therapy intake details from Telegram conversations.
- Extracts service, branch, condition area, urgency, preferred date/time, phone, and contact preference.
- Classifies inquiries as `Hot`, `Warm`, or `Cold`.
- Stores leads, sessions, messages, follow-ups, reports, and settings in Google Sheets.
- Gives the manager a dashboard for analytics, lead review, follow-up visibility, conversations, demo data, and system health.
- Avoids diagnosis, treatment advice, exercises, medication, session-count promises, outcome guarantees, final pricing, and appointment confirmation before staff review.

## Architecture

- Telegram is the customer messaging channel.
- OpenRouter is the only AI provider.
- Google Sheets is the CRM/storage layer.
- Google Apps Script Web App is the only bridge between Node.js and Google Sheets.
- The manager uses the Next.js dashboard. Telegram admin commands remain only as an internal fallback.

No database, SQLite, Prisma, Postgres, Supabase, Airtable, Firebase, Google Cloud service account, Google Sheets API credentials, or credentials JSON are used.

## Tech Stack

- Node.js + TypeScript
- Telegraf
- OpenAI SDK configured for OpenRouter
- Google Apps Script Web App
- Google Sheets
- Next.js + Tailwind CSS + Recharts dashboard
- Express legacy health/admin API
- node-cron follow-ups
- Vitest tests

## Google Sheets Tabs

The Apps Script `setup` action creates or verifies these tabs while preserving existing rows:

- `Leads`
- `Sessions`
- `Messages`
- `FollowUps`
- `Reports`
- `Settings`

Physical therapy lead columns include `branch`, `conditionArea`, `urgency`, `preferredDate`, `preferredTime`, and `contactPreference`. If you previously used older generic columns, setup will add missing new headers without deleting real data. For a clean sheet with only the current columns, create a new Google Sheet and deploy the updated Apps Script there.

## Environment Setup

Copy `.env.example` to `.env` and fill the values:

```bash
TELEGRAM_BOT_TOKEN=123456:replace-with-token
OPENROUTER_API_KEY=sk-or-v1-replace-with-key
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=SmartFlow Physical Therapy Intake System
ADMIN_TELEGRAM_ID=123456789
GOOGLE_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/replace/exec
GOOGLE_SHEETS_WEBAPP_SECRET=replace-with-shared-secret
ADMIN_PORT=3000
ADMIN_PASSWORD=replace-with-admin-password
DASHBOARD_PORT=3001
DASHBOARD_SECRET=replace-with-dashboard-secret
BUSINESS_PRESET=physical-therapy
DEMO_MODE=true
BOT_MODE=polling
```

Do not hardcode secrets in source files. `.env` is ignored by git.

## Telegram Setup

1. Open Telegram and message `@BotFather`.
2. Create a bot with `/newbot`.
3. Copy the bot token into `TELEGRAM_BOT_TOKEN`.
4. Keep `BOT_MODE=polling` for local development.
5. Customers interact with this bot. The manager does not need Telegram for administration.

## OpenRouter Setup

This project uses the official `openai` npm package with:

```ts
baseURL: "https://openrouter.ai/api/v1";
apiKey: process.env.OPENROUTER_API_KEY;
```

Only `OPENROUTER_API_KEY` is used. The model is controlled by `OPENROUTER_MODEL`. `OPENROUTER_SITE_URL` and `OPENROUTER_APP_NAME` are optional OpenRouter attribution headers.

If OpenRouter fails, the bot falls back to deterministic extraction, classification, and safe Arabic replies.

## Google Apps Script Setup

1. Create a Google Sheet.
2. Open **Extensions -> Apps Script**.
3. Paste the full contents of `google-apps-script/Code.gs`.
4. Save the Apps Script project.
5. Deploy as Web App.
6. Set **Execute as** to **Me**.
7. Set **Who has access** to **Anyone**.
8. Copy the Web App URL into `GOOGLE_SHEETS_WEBAPP_URL`.
9. Set a strong shared secret in `GOOGLE_SHEETS_WEBAPP_SECRET`.
10. Run:

```bash
npm run init:secret
npm run setup:sheets
```

If `init:secret` says the secret is already initialized, use the same secret already stored in Apps Script Properties as `SMARTFLOW_SECRET`, or delete that property before initializing again.

After every change to `google-apps-script/Code.gs`, paste the updated file into Apps Script and redeploy the Web App.

For the clean physical therapy version, create a new Google Sheet, paste the latest `Code.gs`, deploy a new Web App, update `.env`, then run `npm run init:secret` and `npm run setup:sheets`. This avoids carrying old generic demo columns into the final CRM.

## Run Locally

Install dependencies:

```bash
npm install
npm --prefix apps/dashboard install
```

Start the Telegram bot and legacy Express server:

```bash
npm run dev
```

Start the manager dashboard:

```bash
npm run dashboard:dev
```

Open:

```text
http://localhost:3001/login
```

Use `ADMIN_PASSWORD` from `.env`.

## Dashboard

The dashboard is the primary admin interface for a non-technical center manager.

Pages:

- Overview: inquiry KPIs, urgent cases, branch demand, service mix, daily volume.
- Intake Leads: search, filters, status badges, lead score, full lead details.
- Conversations: chat-style history from the Messages sheet.
- Follow-ups: pending/sent/failed/cancelled queue and status updates.
- Reports: manager-friendly summary, recommendations, CSV/print/copy actions.
- Center Profile: read-only MoveWell business config.
- Demo: seed and clear safe fake therapy demo data.
- System Health: env presence, setup checklist, and Setup Sheets action without exposing secrets.

## Demo Mode

Set:

```bash
DEMO_MODE=true
BUSINESS_PRESET=physical-therapy
```

Then open the dashboard and use **Demo -> Seed therapy demo data**. This creates realistic fake MoveWell leads, messages, follow-ups, and a report in Google Sheets through Apps Script only. Demo cleanup deletes only rows where `isDemo=true`.

The demo includes realistic Arabic/Egyptian inquiries for:

- Lower back pain in Nasr City
- Neck pain from desk work
- Post-ACL surgery rehabilitation
- Football sports injury
- Home physiotherapy for a parent
- Pediatric physiotherapy consultation
- Shoulder rehabilitation
- Knee pain and nearest branch inquiry
- Posture correction
- Manual therapy price inquiry
- Vague inquiry

## Testing

Run:

```bash
npm test
npm run typecheck
npm run build
npm run dashboard:typecheck
npm run dashboard:build
npm run format:check
```

Apps Script syntax check:

```powershell
Get-Content -Raw google-apps-script\Code.gs | node --check -
```

Read-only Apps Script deployment diagnostics:

```bash
npm run diagnose:apps-script
```

This checks the Web App health endpoint and the `diagnostics` action without creating, updating, or deleting sheet rows. It reports common setup problems such as old deployment code, invalid secret, missing setup, missing headers, timeout, or Apps Script runtime errors.

## Troubleshooting

### Missing env variables

Check `docs/setup-checklist.md`. The app validates required env vars and names missing variables without printing secret values.

### Invalid Apps Script secret

Confirm `GOOGLE_SHEETS_WEBAPP_SECRET` matches the Apps Script Script Property `SMARTFLOW_SECRET`. If it was initialized incorrectly, delete `SMARTFLOW_SECRET` in Apps Script Project Settings and run `npm run init:secret` again.

### Apps Script deployment errors

Run `npm run diagnose:apps-script`. Confirm the Web App deployment uses **Execute as: Me** and **Who has access: Anyone**. Redeploy after every `Code.gs` update.

### Dashboard says Apps Script failed

Open **System Health** in the dashboard. If diagnostics says the deployment is outdated, paste the latest `google-apps-script/Code.gs` into Apps Script and redeploy. If it says setup is incomplete, run **Setup Sheets** from System Health or run `npm run setup:sheets`.

### Dashboard login fails

Use `ADMIN_PASSWORD` from `.env`. Set `DASHBOARD_SECRET` for cookie signing in the Next.js dashboard.

### Telegram polling conflicts

Stop other running copies of the bot, then restart `npm run dev`.

### `EADDRINUSE` on startup

This means another process is already using `ADMIN_PORT` (for example `3000` or `3002`).

On Windows PowerShell:

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID_FROM_NETSTAT> /F
```

Then either restart `npm run dev` or set a different `ADMIN_PORT` value in `.env`.

### OpenRouter failures

Check `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and account credits. The bot still uses safe fallback logic when AI calls fail.

### Demo data did not change

You must copy the updated `google-apps-script/Code.gs` into Apps Script and redeploy. Then use Dashboard -> Demo -> Clear demo data, then Seed therapy demo data.

## Documentation

- `docs/apps-script-setup.md`
- `docs/architecture.md`
- `docs/dashboard.md`
- `docs/setup-checklist.md`
- `docs/client-demo-script.md`
- `docs/demo-conversations.md`
- `docs/manual-qa-checklist.md`
- `docs/case-study.md`
- `docs/ui-quality-guidelines.md`
