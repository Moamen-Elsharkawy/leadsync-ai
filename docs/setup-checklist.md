# Setup Checklist

## Local Project

- Install Node.js 22 or newer.
- Run `npm install`.
- Run `npm --prefix apps/dashboard install`.
- Copy `.env.example` to `.env`.
- Confirm `.env` is ignored by git.

## Required `.env`

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
- `BUSINESS_PRESET=physical-therapy`
- `DEMO_MODE=true` for demos or `false` for real use
- `BOT_MODE=polling`

## Telegram

- Create the bot with BotFather.
- Put the token in `TELEGRAM_BOT_TOKEN`.
- Customers use Telegram.
- The manager uses the dashboard for administration.

## OpenRouter

- Create an OpenRouter key.
- Put it in `OPENROUTER_API_KEY`.
- Set `OPENROUTER_MODEL`.
- Do not add any separate standard OpenAI API key variable.

## Google Sheet And Apps Script

- Create a new clean Google Sheet for the final physical therapy CRM.
- Open **Extensions -> Apps Script**.
- Paste `google-apps-script/Code.gs`.
- Save.
- Deploy as Web App.
- Execute as **Me**.
- Access **Anyone**.
- Copy the URL into `GOOGLE_SHEETS_WEBAPP_URL`.
- Run `npm run init:secret`.
- Run `npm run setup:sheets`.
- Run `npm run diagnose:apps-script` to verify the deployment, secret, tabs, and headers without mutating data.

## Dashboard

- Run `npm run dashboard:dev`.
- Open `http://localhost:3001/login`.
- Login with `ADMIN_PASSWORD`.
- Use System Health to verify setup.

## Demo

- Set `DEMO_MODE=true`.
- Use Dashboard -> Demo -> Seed therapy demo data.
- Review Overview, Intake Leads, Conversations, Follow-ups, and Reports.
- Use Clear demo data when finished.

## Validation

```bash
npm test
npm run typecheck
npm run build
npm run dashboard:typecheck
npm run dashboard:build
npm run format:check
npm run diagnose:apps-script
```

## Port Conflicts

- If `npm run dev` fails with `EADDRINUSE`, another process is already using `ADMIN_PORT`.
- On Windows PowerShell: run `netstat -ano | findstr :3000` (or your configured port), then stop that process with `taskkill /PID <PID> /F`.
- Alternatively, set a different `ADMIN_PORT` in `.env` and restart `npm run dev`.
