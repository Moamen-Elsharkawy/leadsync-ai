# Manual QA Checklist

Use this checklist before a client demo or deployment. Do not paste real secrets into screenshots or public docs.

## Environment And Setup

- `.env` exists and contains all required keys from `.env.example`.
- `.env` is ignored by `.gitignore`.
- `BUSINESS_PRESET` is set to the demo you want: `physical-therapy`, `dental-clinic`, `online-course`, or `custom`.
- `DEMO_MODE=true` for portfolio/client demos.
- Apps Script Web App is deployed with:
  - Execute as: Me
  - Who has access: Anyone
- `SMARTFLOW_SECRET` exists in Apps Script Properties and matches `GOOGLE_SHEETS_WEBAPP_SECRET`.
- Run `npm run setup:sheets` after Apps Script deployment.

## Telegram Bot Scenarios

- `/start` from customer account returns Arabic welcome.
- `/help` from customer account returns Arabic guidance.
- `/start` and `/help` from admin account show admin context.
- Simple Arabic inquiry is saved to Messages.
- English inquiry is handled and answered in Arabic.
- Mixed Arabic-English inquiry is handled.
- Informal Egyptian Arabic is handled.
- Emoji-only or very short messages do not crash the bot.
- Vague message like `عايز اعرف التفاصيل` asks one missing question.
- Spam-like or irrelevant message is classified Cold.
- Multiple fast messages update the same session.
- Returning user continues previous qualification progress.
- User changes service mid-conversation and session fields update.
- User provides missing phone later and lead is updated.
- User refuses phone; Telegram user ID still qualifies contact identity.
- User asks for price; bot does not invent final prices.
- User asks for booking; bot does not confirm final appointment.
- Medical/therapy request is routed to staff without diagnosis or treatment advice.
- Human contact request is handled politely in Arabic.

## Admin Commands

- Admin can use `/leads`.
- Admin can use `/hot`, `/warm`, `/cold`.
- Admin can use `/report`.
- Admin can use `/followups`.
- Admin can inspect `/lead_<id>`.
- Admin can run `/setup_sheets`.
- Admin can run `/demo`, `/demo_dental`, `/demo_course`, `/demo_physical`.
- Admin can run `/clear_demo`.
- Non-admin gets polite Arabic rejection for admin-only commands.

## Physical Therapy Demo

- Set `BUSINESS_PRESET=physical-therapy`.
- Run `/demo_physical`.
- Confirm 10 demo leads are added.
- Confirm leads cover:
  - Lower back pain in Nasr City
  - Post-ACL surgery rehabilitation
  - Football sports injury
  - Home physiotherapy
  - Neck pain
  - Price-only manual therapy inquiry
  - Nearest branch inquiry
  - Urgent shoulder rehab
  - Pediatric physiotherapy inquiry
  - Vague inquiry
- Confirm no bot message diagnoses, recommends exercises, promises recovery, estimates session count, or confirms appointment availability.
- Confirm created dates are spread across the last 14 days.
- Confirm Warm leads have pending follow-ups.
- Confirm `/clear_demo` deletes only `isDemo=true` rows.

## Dashboard Pages

- Login succeeds with `ADMIN_PASSWORD`.
- Wrong password fails.
- Logout clears access.
- Protected pages redirect when not logged in.
- Overview handles empty data.
- Overview handles seeded demo data.
- KPI cards match Sheet counts.
- Charts show empty states when there is no data.
- Charts show labels and readable legends with demo data.
- Leads table search works.
- Status, stage, service, and demo filters work.
- Sorting by created/updated date works.
- Lead Details shows all requested fields.
- Missing lead ID shows a useful error.
- Conversations page shows incoming/outgoing chat bubbles.
- Conversations filters by `leadId` and `telegramUserId`.
- Follow-ups page shows pending, sent, and overdue summaries.
- Reports page provides copy/print/export controls.
- Business Settings is read-only and matches the selected config.
- Demo page can seed and clear through Apps Script.
- System Health shows env presence only and does not reveal values.
- Long Arabic text wraps cleanly on desktop and mobile.

## Failure Scenarios

- Invalid Apps Script secret returns actionable developer error.
- Undeployed Apps Script URL returns actionable developer error.
- OpenRouter failure triggers fallback Arabic reply.
- Telegram send failure logs safely and does not crash the handler.
- Network timeout logs a redacted error and retries where configured.
- Missing required env variable stops startup with the variable name only.

## Validation Commands

```bash
npm test
npm run typecheck
npm run build
npm run format:check
npm run dashboard:typecheck
npm run dashboard:build
```

Live `npm run dev` validation requires real Telegram, OpenRouter, and Apps Script credentials.
