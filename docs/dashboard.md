# Web Admin Dashboard

SmartFlow includes a dedicated Next.js dashboard under `apps/dashboard`. It is separate from the Telegram bot runtime, so the existing bot and legacy Express admin routes keep working.

## Architecture

- Next.js + TypeScript + Tailwind CSS
- Recharts for analytics charts
- Server-side password gate using `ADMIN_PASSWORD`
- HTTP-only cookie session
- Reads CRM data only through the Apps Script Web App contract
- No database, Google Cloud SDK, service account, or credentials JSON

## Run Locally

Install dashboard dependencies once:

```bash
npm --prefix apps/dashboard install
```

Start the dashboard:

```bash
npm run dashboard:dev
```

Open:

```text
http://localhost:3001/login
```

Use the same `ADMIN_PASSWORD` configured in `.env`.

## Pages

- Overview: KPI cards, charts, latest leads
- Leads: searchable and filterable lead table
- Lead Details: full lead record and recommended next action
- Conversations: chat-style Messages sheet viewer
- Follow-ups: FollowUps sheet queue and status summary
- Reports: owner-friendly report, copy, print, CSV export
- Business Settings: read-only business config and Settings sheet values
- Demo: seed and clear demo data through Apps Script
- System Health: env presence and architecture checklist without secret values

## Demo Presets

The dashboard reads the active `BUSINESS_PRESET` and shows the matching business settings. Supported presets:

- `physical-therapy` for MoveWell Physical Therapy Centers
- `dental-clinic` for Pearl Smile Dental Center
- `online-course` for SkillBridge Academy
- `custom` for `config/business.json`

Use the Demo page or Telegram commands to seed safe fake data. Physical therapy demo data is medically cautious: it collects intake details and routes leads to staff without diagnosis, treatment advice, recovery promises, or appointment confirmation.

## Apps Script Actions

The dashboard uses existing actions plus:

- `listMessages`
- `listMessagesByLead`
- `listMessagesByTelegramUser`
- `listSettings`
- `upsertSetting`
- `getDashboardData`

After copying a changed `google-apps-script/Code.gs` into Apps Script, redeploy the Web App and run:

```bash
npm run setup:sheets
```

## Security Notes

- Do not expose `.env` to the browser.
- `ADMIN_PASSWORD` is checked server-side only.
- The dashboard shows whether env variables are present, not their values.
- Demo cleanup deletes only rows where `isDemo=true`.
