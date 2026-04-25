# SmartFlow AI Telegram Sales Agent

Production-quality MVP for a Telegram AI sales assistant. The bot uses Telegram for messaging, OpenRouter for AI, Google Sheets as the CRM, and a Google Apps Script Web App as the only bridge to Sheets.

## Architecture

- Node.js + TypeScript app
- Telegraf Telegram bot in polling mode
- OpenAI SDK configured for OpenRouter
- Google Apps Script Web App using the active spreadsheet
- Google Sheets tabs: `Leads`, `Sessions`, `Messages`, `FollowUps`, `Reports`, `Settings`
- Express admin API and simple dashboard
- Professional Next.js web dashboard under `apps/dashboard`
- Cron-based follow-up sender

No Google Cloud service account, no Google Sheets API credentials, and no database are used.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment values:

   ```bash
   cp .env.example .env
   ```

3. Fill `.env` with:
   - `TELEGRAM_BOT_TOKEN`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL`
   - `OPENROUTER_SITE_URL`
   - `OPENROUTER_APP_NAME`
   - `OPENROUTER_TIMEOUT_MS`
   - `OPENROUTER_MAX_RETRIES`
   - `ADMIN_TELEGRAM_ID`
   - `GOOGLE_SHEETS_WEBAPP_URL`
   - `GOOGLE_SHEETS_WEBAPP_SECRET`
   - `ADMIN_PASSWORD`
   - `BUSINESS_PRESET`
   - `DEMO_MODE`

4. Complete the **Google Apps Script Setup** section below.

5. Run locally:

   ```bash
   npm run dev
   ```

The admin dashboard runs at `http://localhost:3000/dashboard?password=YOUR_ADMIN_PASSWORD` unless `ADMIN_PORT` is changed.

The professional web dashboard runs separately at `http://localhost:3001/login`:

```bash
npm --prefix apps/dashboard install
npm run dashboard:dev
```

## Demo Script

Use Demo Mode when presenting the project to clients, recruiters, or on a portfolio page. Demo Mode marks all new bot-created leads as demo leads, seeds safe fake Arabic leads for the active `BUSINESS_PRESET`, and disables automatic customer follow-up sends. Admin notifications still work, so Hot lead alerts can be shown safely.

1. Set this in `.env`:

   ```bash
   BUSINESS_PRESET=dental-clinic
   DEMO_MODE=true
   ```

   Use `BUSINESS_PRESET=physical-therapy` for the MoveWell therapy demo or `BUSINESS_PRESET=online-course` to switch to the course business version.

2. Start the app:

   ```bash
   npm run dev
   ```

3. In Telegram, send `/setup_sheets` as the admin user to verify the spreadsheet tabs and headers.

4. Send `/demo` as the admin user. This seeds 10 realistic fake leads for the active preset, sessions, reports, pending Warm follow-ups, and Arabic customer messages into Google Sheets through the Apps Script Web App.

5. Open the dashboard:

   ```text
   http://localhost:3000/dashboard?password=YOUR_ADMIN_PASSWORD
   ```

6. Show the workflow:
   - `/leads` to list the latest pipeline.
   - `/hot` to show urgent opportunities.
   - `/lead_lead_demo_physical_therapy_001`, `/lead_lead_demo_dental_clinic_001`, or `/lead_lead_demo_online_course_001` to inspect a full demo lead.
   - `/report` to show Hot/Warm/Cold counts.
   - The Google Sheet tabs to prove the system uses Sheets as the CRM.

7. Send one of the Arabic sample messages from `docs/demo-conversations.md` to the bot from a non-admin Telegram account and show the qualification flow.

8. Send `/clear_demo` as the admin user when finished. This calls the Apps Script `clearDemoData` action and deletes only rows where `isDemo` is true.

Suggested portfolio materials:

- `docs/demo-conversations.md` contains safe demo conversations.
- `docs/dental-clinic-demo.md` contains the Dental Clinic walkthrough.
- `docs/online-course-demo.md` contains the Online Course walkthrough.
- `docs/linkedin-post.md` contains ready-to-edit LinkedIn launch copy.

## Google Apps Script Setup

This integration does not use Google Cloud, Service Accounts, Google Sheets API credentials, or credentials JSON.

1. Create a Google Sheet.

2. Open **Extensions -> Apps Script** from that Google Sheet.

3. Paste the full contents of `google-apps-script/Code.gs`.

4. Save the Apps Script project.

5. Run `initSecret` once through the Node script or HTTP request. This requires the deployed Web App URL, so complete steps 6-10 first, then run either:

   ```bash
   npm run init:secret
   ```

   Or send the HTTP request directly:

   ```bash
   curl -X POST "$GOOGLE_SHEETS_WEBAPP_URL" \
     -H "Content-Type: application/json" \
     -d "{\"action\":\"initSecret\",\"secret\":\"$GOOGLE_SHEETS_WEBAPP_SECRET\"}"
   ```

6. Deploy as Web App.

7. Set **Execute as** to **Me**.

8. Set **Who has access** to **Anyone**.

9. Copy the Web App URL.

10. Put it in `.env` as `GOOGLE_SHEETS_WEBAPP_URL`, and set the same secret in `GOOGLE_SHEETS_WEBAPP_SECRET`.

11. Run:

```bash
npm run setup:sheets
```

The `setup` action creates missing tabs and headers while preserving existing spreadsheet data.

## OpenRouter Setup

This project uses OpenRouter through the official `openai` npm package. Configure only `OPENROUTER_API_KEY`; do not configure a separate standard OpenAI API key variable.

1. Create an OpenRouter API key.

2. Add these values to `.env`:

   ```bash
   OPENROUTER_API_KEY=sk-or-v1-your-key
   OPENROUTER_MODEL=openai/gpt-4o-mini
   OPENROUTER_SITE_URL=http://localhost:3000
   OPENROUTER_APP_NAME=SmartFlow AI Telegram Sales Agent
   OPENROUTER_TIMEOUT_MS=12000
   OPENROUTER_MAX_RETRIES=1
   ```

3. Change `OPENROUTER_MODEL` whenever you want to switch models.

4. `OPENROUTER_SITE_URL` and `OPENROUTER_APP_NAME` are optional OpenRouter attribution headers.

5. If OpenRouter is unavailable, the bot uses deterministic fallback extraction, classification, and Arabic replies so the conversation can continue.

## Business Configuration

The bot is reusable across businesses through `BUSINESS_PRESET`.

- `BUSINESS_PRESET=custom` loads `config/business.json`.
- `BUSINESS_PRESET=physical-therapy` loads `config/examples/physical-therapy.json`.
- `BUSINESS_PRESET=dental-clinic` loads `config/examples/dental-clinic.json`.
- `BUSINESS_PRESET=online-course` loads `config/examples/online-course-business.json`.

Use `custom` when editing your own business config. The preset files are productized portfolio versions for a physical therapy center, a dental clinic, and an online course business.

Required top-level fields:

- `businessName`
- `businessType`
- `services`
- `workingHours`
- `tone`
- `language`
- `unavailableDays`
- `adminContact`
- `qualificationQuestions`
- `forbiddenClaims`

The AI reply generator uses this config in every customer reply. It is instructed to reply in Arabic only, mention only services listed in `services`, respect `forbiddenClaims`, and avoid inventing prices, guarantees, deadlines, discounts, availability, or booking confirmations.

Example configs are available in:

- `config/examples/dental-clinic.json`
- `config/examples/marketing-agency.json`
- `config/examples/online-course-business.json`
- `config/examples/physical-therapy.json`

To switch businesses:

1. Set `BUSINESS_PRESET` in `.env`.
2. Keep `language` as `ar` for Arabic customer replies.
3. Update `services` to only the services this business actually offers.
4. Update `qualificationQuestions` with Arabic questions.
5. Add sensitive claims to `forbiddenClaims`.
6. Restart the app with `npm run dev`.

No code changes, database, Google Cloud setup, Service Account, or Google Sheets API credentials are required.

## Bot Commands

- `/start` - customer welcome
- `/help` - command help
- `/leads` - list recent leads
- `/hot` - list hot leads
- `/warm` - list warm leads
- `/cold` - list cold leads
- `/report` - show report summary
- `/followups` - show follow-ups
- `/lead_<id>` - show one lead
- `/setup_sheets` - create missing sheets and headers
- `/demo` - seed demo data for the active business preset
- `/demo_dental` - seed Dental Clinic demo data
- `/demo_course` - seed Online Course demo data
- `/demo_physical` - seed Physical Therapy demo data
- `/clear_demo` - clear demo data

Admin-only commands require `ADMIN_TELEGRAM_ID`.

## Admin Dashboard And API

The Express admin server starts with the bot on `ADMIN_PORT`. It is kept as a legacy lightweight dashboard and JSON API. It reads all CRM data through the Apps Script Web App client; no database or Google API credentials are used.

Set these values in `.env`:

```bash
ADMIN_PORT=3000
ADMIN_PASSWORD=replace-with-admin-password
```

Routes:

- `GET /health` - public health check
- `GET /dashboard?password=ADMIN_PASSWORD` - simple HTML dashboard
- `GET /leads?password=ADMIN_PASSWORD` - latest leads as JSON
- `GET /leads/hot?password=ADMIN_PASSWORD` - Hot leads as JSON
- `GET /leads/:id?password=ADMIN_PASSWORD` - one lead as JSON
- `GET /report?password=ADMIN_PASSWORD` - summary report as JSON

You can also authenticate with the `x-admin-password` header or HTTP Basic auth.

## Professional Web Dashboard

A client-ready Next.js dashboard is available in `apps/dashboard`.

Features:

- Server-side admin login with `ADMIN_PASSWORD`
- Overview KPIs and Recharts analytics
- Leads table with search, filters, sorting, badges, and lead details
- Chat-style conversation viewer from the Messages sheet
- Follow-up queue visibility from the FollowUps sheet
- Reports page with copy, print, and CSV export
- Read-only business settings page
- Demo controls for seeding and clearing demo data
- System health page that shows env presence without exposing values

Run it:

```bash
npm --prefix apps/dashboard install
npm run dashboard:dev
```

Open:

```text
http://localhost:3001/login
```

Use `ADMIN_PASSWORD` from `.env`. Optional dashboard env values:

```bash
DASHBOARD_PORT=3001
DASHBOARD_SECRET=replace-with-dashboard-secret
```

The dashboard uses the same Apps Script Web App storage bridge. It does not read Google Sheets directly.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run format:check
npm run dashboard:typecheck
npm run dashboard:build
```

## Troubleshooting

### Missing environment variable

Run through `docs/setup-checklist.md` and confirm every required key exists in `.env`. The app validates environment variables at startup and names missing variables without printing secret values.

Required variables:

- `TELEGRAM_BOT_TOKEN`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_SITE_URL`
- `OPENROUTER_APP_NAME`
- `ADMIN_TELEGRAM_ID`
- `GOOGLE_SHEETS_WEBAPP_URL`
- `GOOGLE_SHEETS_WEBAPP_SECRET`
- `ADMIN_PORT`
- `ADMIN_PASSWORD`
- `DASHBOARD_PORT`
- `DASHBOARD_SECRET`
- `BUSINESS_PRESET`
- `DEMO_MODE`
- `BOT_MODE`

### Invalid Apps Script secret

If you see an invalid secret error, confirm `GOOGLE_SHEETS_WEBAPP_SECRET` matches the Apps Script Script Property named `SMARTFLOW_SECRET`. If the property was initialized with the wrong value, delete `SMARTFLOW_SECRET` in Apps Script Project Settings and run `npm run init:secret` again.

### Apps Script deployment errors

Confirm the Web App is deployed with:

- Execute as: `Me`
- Who has access: `Anyone`

After every Apps Script code change, create a new deployment or update the existing deployment, then copy the active Web App URL back into `.env`.

### Telegram polling conflicts

If Telegram reports polling conflicts, another copy of the bot may already be running. Stop other local terminals, hosting processes, or previous dev sessions, then run `npm run dev` again.

### OpenRouter failures

The bot logs OpenRouter failures with secrets redacted and uses fallback extraction, classification, and Arabic replies. Check that `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and account credits are valid.

### Dashboard unauthorized

Use one of these authentication methods:

- `http://localhost:3000/dashboard?password=YOUR_ADMIN_PASSWORD`
- `x-admin-password` header
- HTTP Basic auth password

### Demo cleanup

Use `/clear_demo` from the admin Telegram account. The Apps Script action deletes only rows where `isDemo` is true and does not delete real rows.

### Wrong demo business

Check `BUSINESS_PRESET` in `.env`. `/demo` uses the active preset. You can also force a seed with `/demo_physical`, `/demo_dental`, or `/demo_course`. If `google-apps-script/Code.gs` was changed, copy it into Apps Script, redeploy the Web App, and run `npm run setup:sheets`.

## Additional Docs

- `docs/setup-checklist.md`
- `docs/apps-script-setup.md`
- `docs/architecture.md`
- `docs/dashboard.md`
- `docs/client-demo-script.md`
- `docs/case-study.md`
- `docs/demo-conversations.md`
- `docs/manual-qa-checklist.md`
- `docs/dental-clinic-demo.md`
- `docs/online-course-demo.md`

## Notes

- Customer-facing replies are Arabic.
- Code, file names, comments, and documentation are English.
- The app uses Telegram polling mode for the MVP.
- OpenRouter credentials are never hardcoded.
